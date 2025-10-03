from flask import Flask, render_template, request, redirect, url_for, flash, jsonify, session
from flask_sqlalchemy import SQLAlchemy
from flask_socketio import SocketIO, emit, join_room, leave_room
from datetime import datetime, timedelta
import secrets
import random
import os
import math
import json
import logging
from logging.handlers import RotatingFileHandler

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-change-this'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///dota2shuffle.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# Configure logging
if not app.debug:
    # Create logs directory if it doesn't exist
    if not os.path.exists('logs'):
        os.mkdir('logs')

    # File handler for general logs
    file_handler = RotatingFileHandler('logs/dota2shuffle.log', maxBytes=10240000, backupCount=10)
    file_handler.setFormatter(logging.Formatter(
        '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
    ))
    file_handler.setLevel(logging.INFO)
    app.logger.addHandler(file_handler)

    # File handler for errors
    error_handler = RotatingFileHandler('logs/errors.log', maxBytes=10240000, backupCount=10)
    error_handler.setFormatter(logging.Formatter(
        '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
    ))
    error_handler.setLevel(logging.ERROR)
    app.logger.addHandler(error_handler)

    app.logger.setLevel(logging.INFO)
    app.logger.info('Dota2Shuffle startup')
else:
    # Console logging for debug mode
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(logging.Formatter(
        '%(asctime)s %(levelname)s: %(message)s'
    ))
    console_handler.setLevel(logging.DEBUG)
    app.logger.addHandler(console_handler)
    app.logger.setLevel(logging.DEBUG)
    app.logger.info('Dota2Shuffle startup (DEBUG mode)')

# Custom Jinja2 filter for JSON parsing
@app.template_filter('from_json')
def from_json_filter(json_string):
    """Parse JSON string to Python object"""
    try:
        return json.loads(json_string)
    except (json.JSONDecodeError, TypeError):
        return []

# Database migration function for schema updates
def migrate_database():
    """Handle database schema migrations"""
    with app.app_context():
        try:
            # Check if we need to add new columns
            from sqlalchemy import inspect, text
            inspector = inspect(db.engine)
            
            # Get existing tables
            existing_tables = inspector.get_table_names()
            
            # If player table exists, check for new columns
            if 'player' in existing_tables:
                existing_columns = [col['name'] for col in inspector.get_columns('player')]

                # Add masterlist_player_id column if it doesn't exist
                if 'masterlist_player_id' not in existing_columns:
                    print("Adding masterlist_player_id column to player table...")
                    db.session.execute(text('ALTER TABLE player ADD COLUMN masterlist_player_id INTEGER'))
                    db.session.commit()
                    print("Migration completed: Added masterlist_player_id column")

                # Add status column if it doesn't exist
                if 'status' not in existing_columns:
                    print("Adding status column to player table...")
                    db.session.execute(text("ALTER TABLE player ADD COLUMN status VARCHAR(20) DEFAULT 'Present' NOT NULL"))
                    db.session.commit()
                    print("Migration completed: Added status column")

            # If registration_link table exists, check for new columns
            if 'registration_link' in existing_tables:
                existing_columns = [col['name'] for col in inspector.get_columns('registration_link')]

                # Add opens_at column if it doesn't exist
                if 'opens_at' not in existing_columns:
                    print("Adding opens_at column to registration_link table...")
                    db.session.execute(text('ALTER TABLE registration_link ADD COLUMN opens_at DATETIME'))
                    db.session.commit()
                    print("Migration completed: Added opens_at column")
            
            # If player_masterlist table doesn't exist, create it
            if 'player_masterlist' not in existing_tables:
                print("Creating player_masterlist table...")
                db.create_all()
                print("Migration completed: Created player_masterlist table")
            else:
                # Add is_banned column to player_masterlist if it doesn't exist
                existing_columns = [col['name'] for col in inspector.get_columns('player_masterlist')]
                if 'is_banned' not in existing_columns:
                    print("Adding is_banned column to player_masterlist table...")
                    db.session.execute(text("ALTER TABLE player_masterlist ADD COLUMN is_banned BOOLEAN DEFAULT 0 NOT NULL"))
                    db.session.commit()
                    print("Migration completed: Added is_banned column to player_masterlist")

            if 'bracket' not in existing_tables or 'match' not in existing_tables or 'team' not in existing_tables or 'team_players' not in existing_tables:
                print("Creating bracket, match, team and team_players tables...")
                db.create_all()
                print("Migration completed: Created bracket, match, team and team_players tables")
                
        except Exception as e:
            print(f"Migration error: {e}")
            # If migration fails, just create all tables
            db.create_all()

# Database Models
class Admin(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(120), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class RegistrationLink(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    link_code = db.Column(db.String(32), unique=True, nullable=False)
    admin_id = db.Column(db.Integer, db.ForeignKey('admin.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    max_players = db.Column(db.Integer, default=None)  # None means unlimited
    is_active = db.Column(db.Boolean, default=True)  # True = Open, False = Closed
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    opens_at = db.Column(db.DateTime)  # Scheduled opening time
    expires_at = db.Column(db.DateTime)

    admin = db.relationship('Admin', backref=db.backref('registration_links', lazy=True))

class PlayerMasterlist(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    player_name = db.Column(db.String(100), unique=True, nullable=False)
    real_mmr = db.Column(db.Integer, nullable=False)
    steam_id = db.Column(db.String(50), nullable=True)  # Optional Steam ID
    notes = db.Column(db.Text, nullable=True)
    is_banned = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Player(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    player_name = db.Column(db.String(100), nullable=False)
    mmr = db.Column(db.Integer, nullable=False)
    preferred_roles = db.Column(db.Text, nullable=False)  # JSON string of selected roles
    registration_link_id = db.Column(db.Integer, db.ForeignKey('registration_link.id'), nullable=False)
    masterlist_player_id = db.Column(db.Integer, db.ForeignKey('player_masterlist.id'), nullable=True)  # Link to masterlist
    registered_at = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.String(20), default='Present', nullable=False)

    registration_link = db.relationship('RegistrationLink', backref=db.backref('players', lazy=True))
    masterlist_player = db.relationship('PlayerMasterlist', backref=db.backref('registrations', lazy=True))

class Bracket(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    registration_link_id = db.Column(db.Integer, db.ForeignKey('registration_link.id'), nullable=False)
    num_teams = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    registration_link = db.relationship('RegistrationLink', backref=db.backref('bracket', uselist=False))

class Match(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    bracket_id = db.Column(db.Integer, db.ForeignKey('bracket.id'), nullable=False)
    round_number = db.Column(db.Integer, nullable=False)
    match_number = db.Column(db.Integer, nullable=False)
    team1_name = db.Column(db.String(100))
    team2_name = db.Column(db.String(100))
    winner_name = db.Column(db.String(100))
    
    bracket = db.relationship('Bracket', backref=db.backref('matches', lazy=True))

team_players = db.Table('team_players',
    db.Column('team_id', db.Integer, db.ForeignKey('team.id'), primary_key=True),
    db.Column('player_id', db.Integer, db.ForeignKey('player.id'), primary_key=True)
)

class Team(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    bracket_id = db.Column(db.Integer, db.ForeignKey('bracket.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    players = db.relationship('Player', secondary=team_players, lazy='subquery',
        backref=db.backref('teams', lazy=True))

    bracket = db.relationship('Bracket', backref=db.backref('teams', lazy=True))

# Lobby System Models
class Lobby(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    lobby_code = db.Column(db.String(50), unique=True, nullable=False)
    admin_id = db.Column(db.Integer, db.ForeignKey('admin.id'), nullable=False)
    status = db.Column(db.String(20), default='active', nullable=False)  # active, closed
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    admin = db.relationship('Admin', backref=db.backref('lobbies', lazy=True))

class LobbyPlayer(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    lobby_id = db.Column(db.Integer, db.ForeignKey('lobby.id'), nullable=False)
    player_name = db.Column(db.String(100), nullable=False)
    mmr = db.Column(db.Integer, nullable=False)
    preferred_roles = db.Column(db.Text, nullable=False)  # JSON array
    status = db.Column(db.String(20), default='waiting', nullable=False)  # waiting, in_party, ready
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)

    lobby = db.relationship('Lobby', backref=db.backref('players', lazy=True))

class LobbyParty(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    lobby_id = db.Column(db.Integer, db.ForeignKey('lobby.id'), nullable=False)
    party_name = db.Column(db.String(100), nullable=False)
    leader_id = db.Column(db.Integer, db.ForeignKey('lobby_player.id'), nullable=False)
    status = db.Column(db.String(20), default='forming', nullable=False)  # forming, ready
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    lobby = db.relationship('Lobby', backref=db.backref('parties', lazy=True))
    leader = db.relationship('LobbyPlayer', foreign_keys=[leader_id])

# Association table for party members
party_members = db.Table('party_members',
    db.Column('party_id', db.Integer, db.ForeignKey('lobby_party.id'), primary_key=True),
    db.Column('player_id', db.Integer, db.ForeignKey('lobby_player.id'), primary_key=True)
)

class PartyInvite(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    party_id = db.Column(db.Integer, db.ForeignKey('lobby_party.id'), nullable=False)
    from_player_id = db.Column(db.Integer, db.ForeignKey('lobby_player.id'), nullable=False)
    to_player_id = db.Column(db.Integer, db.ForeignKey('lobby_player.id'), nullable=False)
    status = db.Column(db.String(20), default='pending', nullable=False)  # pending, accepted, declined
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    party = db.relationship('LobbyParty', backref=db.backref('invites', lazy=True))
    from_player = db.relationship('LobbyPlayer', foreign_keys=[from_player_id])
    to_player = db.relationship('LobbyPlayer', foreign_keys=[to_player_id])

# Update LobbyParty to include members relationship
LobbyParty.members = db.relationship('LobbyPlayer', secondary=party_members, lazy='subquery',
    backref=db.backref('party', lazy=True))

class LobbyBracket(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    lobby_id = db.Column(db.Integer, db.ForeignKey('lobby.id'), nullable=False)
    name = db.Column(db.String(200), nullable=False)
    status = db.Column(db.String(20), default='active', nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    lobby = db.relationship('Lobby', backref=db.backref('brackets', lazy=True))

class LobbyMatch(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    bracket_id = db.Column(db.Integer, db.ForeignKey('lobby_bracket.id'), nullable=False)
    party1_id = db.Column(db.Integer, db.ForeignKey('lobby_party.id'), nullable=True)
    party2_id = db.Column(db.Integer, db.ForeignKey('lobby_party.id'), nullable=True)
    winner_id = db.Column(db.Integer, db.ForeignKey('lobby_party.id'), nullable=True)
    round = db.Column(db.Integer, nullable=False)
    match_number = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(20), default='pending', nullable=False)

    bracket = db.relationship('LobbyBracket', backref=db.backref('matches', lazy=True))
    party1 = db.relationship('LobbyParty', foreign_keys=[party1_id])
    party2 = db.relationship('LobbyParty', foreign_keys=[party2_id])
    winner = db.relationship('LobbyParty', foreign_keys=[winner_id])

# Routes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/register/<link_code>')
def register(link_code):
    reg_link = RegistrationLink.query.filter_by(link_code=link_code, is_active=True).first()
    if not reg_link:
        flash('Invalid or expired registration link', 'error')
        return redirect(url_for('index'))

    if reg_link.expires_at and reg_link.expires_at < datetime.now():
        flash('Registration link has expired', 'error')
        return redirect(url_for('index'))

    # Check if registration has opened yet
    registration_opened = True
    if reg_link.opens_at:
        current_time = datetime.now()
        if reg_link.opens_at > current_time:
            registration_opened = False
            app.logger.info(f'Registration not yet open. Opens at: {reg_link.opens_at}, Current time: {current_time}')
        else:
            app.logger.info(f'Registration is open. Opened at: {reg_link.opens_at}, Current time: {current_time}')

    # Check if user is already registered
    if session.get(f'registered_{link_code}'):
        player_name = session.get(f'player_name_{link_code}', 'Unknown')
        flash(f'You have already registered as {player_name}. Registration is complete!', 'success')
        return render_template('register.html', reg_link=reg_link, already_registered=True, player_name=player_name, registration_opened=registration_opened)

    return render_template('register.html', reg_link=reg_link, already_registered=False, registration_opened=registration_opened)

@app.route('/submit_registration', methods=['POST'])
def submit_registration():
    import json

    link_code = request.form.get('link_code')
    player_name = request.form.get('player_name')
    mmr = request.form.get('mmr')
    preferred_roles = request.form.getlist('preferred_roles')  # Get multiple selected roles

    app.logger.info(f'Registration attempt - Player: {player_name}, Link: {link_code}')

    reg_link = RegistrationLink.query.filter_by(link_code=link_code, is_active=True).first()
    if not reg_link:
        app.logger.warning(f'Invalid registration link attempted: {link_code}')
        flash('Invalid registration link', 'error')
        return redirect(url_for('index'))
    
    # Check if player already registered (by name for this event)
    existing_player = Player.query.filter_by(player_name=player_name, registration_link_id=reg_link.id).first()
    if existing_player:
        flash('You have already registered for this event', 'error')
        return redirect(url_for('register', link_code=link_code))
    
    # Check if registration is full (only if max_players is set)
    if reg_link.max_players is not None:
        current_players = Player.query.filter_by(registration_link_id=reg_link.id).count()
        if current_players >= reg_link.max_players:
            flash('Registration is full', 'error')
            return redirect(url_for('register', link_code=link_code))
    
    # Validate that at least one role is selected
    if not preferred_roles:
        flash('Please select at least one preferred role', 'error')
        return redirect(url_for('register', link_code=link_code))
    
    # Check if player exists in masterlist
    masterlist_player = PlayerMasterlist.query.filter_by(player_name=player_name).first()
    final_mmr = int(mmr)
    masterlist_player_id = None

    if masterlist_player:
        # Check if player is banned
        if masterlist_player.is_banned:
            flash('You are banned from registering for events. Please contact the administrator.', 'error')
            app.logger.warning(f'Banned player attempted registration: {player_name}')
            return redirect(url_for('register', link_code=link_code))

        # Use real MMR from masterlist
        final_mmr = masterlist_player.real_mmr
        masterlist_player_id = masterlist_player.id
        flash(f'Welcome back {player_name}! Using your registered MMR: {final_mmr}', 'info')
    else:
        # Create new masterlist entry for new player
        new_masterlist_player = PlayerMasterlist(
            player_name=player_name,
            real_mmr=final_mmr
        )
        db.session.add(new_masterlist_player)
        db.session.flush()  # Get the ID without committing
        masterlist_player_id = new_masterlist_player.id
        app.logger.info(f'New player added to masterlist: {player_name} (MMR: {final_mmr})')
        flash(f'New player {player_name} registered with MMR: {final_mmr}', 'info')
    
    try:
        new_player = Player(
            player_name=player_name,
            mmr=final_mmr,
            preferred_roles=json.dumps(preferred_roles),  # Store as JSON string
            registration_link_id=reg_link.id,
            masterlist_player_id=masterlist_player_id
        )
        db.session.add(new_player)
        db.session.commit()

        app.logger.info(f'Player registered successfully - Name: {player_name}, MMR: {final_mmr}, Event: {reg_link.title}')

        # Set session flag to indicate this user has registered
        session[f'registered_{link_code}'] = True
        session[f'player_name_{link_code}'] = player_name

        flash('Registration successful!', 'success')
        return redirect(url_for('shuffle', link_code=link_code))
    except Exception as e:
        app.logger.error(f'Registration failed for {player_name}: {str(e)}')
        flash('Registration failed. Please try again.', 'error')
        return redirect(url_for('register', link_code=link_code))

@app.route('/shuffle/<link_code>')
def shuffle(link_code):
    reg_link = RegistrationLink.query.filter_by(link_code=link_code, is_active=True).first()
    if not reg_link:
        flash('Invalid registration link', 'error')
        return redirect(url_for('index'))
    
    # Check if user is already registered via session
    if session.get(f'registered_{link_code}'):
        player_name = session.get(f'player_name_{link_code}', 'Unknown')
        flash(f'You have already registered as {player_name}. Registration is complete!', 'info')
        return redirect(url_for('register', link_code=link_code))
    
    players = Player.query.filter_by(registration_link_id=reg_link.id).all()
    
    # If no players are registered yet, redirect to registration
    if not players:
        flash('Please register first before viewing the shuffle', 'info')
        return redirect(url_for('register', link_code=link_code))
    
    return render_template('shuffle.html', reg_link=reg_link, players=players)

@app.route('/api/shuffle_teams/<link_code>')
def api_shuffle_teams(link_code):
    app.logger.info(f'Shuffle teams requested for link: {link_code}')

    reg_link = RegistrationLink.query.filter_by(link_code=link_code, is_active=True).first()
    if not reg_link:
        app.logger.warning(f'Shuffle attempted with invalid link: {link_code}')
        return jsonify({'error': 'Invalid link'}), 400

    # Get all present players, then filter out banned ones from masterlist
    all_players = Player.query.filter_by(registration_link_id=reg_link.id, status='Present').all()

    # Filter out players who are banned in the masterlist
    players = []
    for player in all_players:
        if player.masterlist_player_id:
            masterlist_player = PlayerMasterlist.query.get(player.masterlist_player_id)
            if masterlist_player and not masterlist_player.is_banned:
                players.append(player)
        else:
            # If player is not in masterlist, include them
            players.append(player)

    if len(players) < 10:
        app.logger.warning(f'Shuffle attempted with insufficient players ({len(players)}) for event: {reg_link.title}')
        return jsonify({'error': 'Not enough present players to shuffle. At least 10 players are required.'}), 400

    app.logger.info(f'Shuffling {len(players)} players for event: {reg_link.title}')
    random.shuffle(players)

    # Get num_teams from query parameter or calculate automatically
    num_teams_param = request.args.get('num_teams', type=int)
    if num_teams_param and num_teams_param >= 2 and num_teams_param <= len(players) // 5:
        num_teams = num_teams_param
        app.logger.info(f'Using specified team count: {num_teams} teams')
    else:
        num_teams = len(players) // 5
        app.logger.info(f'Using automatic team count: {num_teams} teams')
    roles_definition = ['Carry', 'Midlane', 'Offlane', 'Support', 'Hard Support']
    
    teams = [[] for _ in range(num_teams)]
    team_needed_roles = [set(roles_definition) for _ in range(num_teams)]
    unassigned_players = []
    
    # First pass: try to fill roles
    for player in players:
        placed = False
        sorted_teams_indices = sorted(range(num_teams), key=lambda k: len(teams[k]))

        for i in sorted_teams_indices:
            p_roles = json.loads(player.preferred_roles)
            random.shuffle(p_roles)
            
            needed_and_preferred = [role for role in p_roles if role in team_needed_roles[i]]
            
            if needed_and_preferred:
                role_to_fill = needed_and_preferred[0]
                teams[i].append(player)
                team_needed_roles[i].remove(role_to_fill)
                placed = True
                break
        
        if not placed:
            unassigned_players.append(player)

    # Second pass: fill remaining empty slots
    all_remaining_players = unassigned_players
    for i in range(num_teams):
        while len(teams[i]) < 5:
            if all_remaining_players:
                teams[i].append(all_remaining_players.pop(0))
            else:
                break

    # --- MMR Balancing Swap Phase ---
    for _ in range(100): # Number of iterations for balancing
        if num_teams < 2: break

        # Find teams with highest and lowest MMR
        avg_mmrs = [sum(p.mmr for p in team) / len(team) if team else 0 for team in teams]
        high_mmr_team_index = avg_mmrs.index(max(avg_mmrs))
        low_mmr_team_index = avg_mmrs.index(min(avg_mmrs))

        if high_mmr_team_index == low_mmr_team_index: break

        high_team = teams[high_mmr_team_index]
        low_team = teams[low_mmr_team_index]

        # Try to find a valid swap
        best_swap = None
        min_mmr_diff = abs(avg_mmrs[high_mmr_team_index] - avg_mmrs[low_mmr_team_index])

        for p_high in high_team:
            for p_low in low_team:
                # Simple swap: players with at least one common role
                p_high_roles = set(json.loads(p_high.preferred_roles))
                p_low_roles = set(json.loads(p_low.preferred_roles))

                if p_high_roles.intersection(p_low_roles):
                    # Calculate new average MMRs if swapped
                    new_high_team_mmr = (sum(p.mmr for p in high_team) - p_high.mmr + p_low.mmr) / len(high_team)
                    new_low_team_mmr = (sum(p.mmr for p in low_team) - p_low.mmr + p_high.mmr) / len(low_team)
                    new_diff = abs(new_high_team_mmr - new_low_team_mmr)

                    if new_diff < min_mmr_diff:
                        min_mmr_diff = new_diff
                        best_swap = (p_high, p_low)
        
        if best_swap:
            p_high, p_low = best_swap
            high_team.remove(p_high)
            low_team.remove(p_low)
            high_team.append(p_low)
            low_team.append(p_high)

    # Format the output
    output_teams = []
    for i, team_players_list in enumerate(teams):
        if team_players_list:
            avg_mmr = round(sum(p.mmr for p in team_players_list) / len(team_players_list))
            output_teams.append({
                'name': f'Team {i+1}',
                'players': sorted([{'id': p.id, 'name': p.player_name, 'mmr': p.mmr, 'roles': json.loads(p.preferred_roles)} for p in team_players_list], key=lambda x: x['mmr'], reverse=True),
                'avg_mmr': avg_mmr
            })

    reserved_players = all_remaining_players

    return jsonify({
        'teams': sorted(output_teams, key=lambda x: x['avg_mmr'], reverse=True),
        'reserved': [{'id': p.id, 'name': p.player_name, 'mmr': p.mmr, 'roles': json.loads(p.preferred_roles)} for p in reserved_players]
    })

@app.route('/api/replacement_candidates/<link_code>')
def api_replacement_candidates(link_code):
    """Get list of players who can be used as replacements (reserves and absent players)"""
    reg_link = RegistrationLink.query.filter_by(link_code=link_code, is_active=True).first()
    if not reg_link:
        return jsonify({'error': 'Invalid link'}), 400

    # Get all registered players who are either absent or could be reserves
    all_players = Player.query.filter_by(registration_link_id=reg_link.id).all()

    # Filter out banned players
    candidates = []
    for player in all_players:
        if player.masterlist_player_id:
            masterlist_player = PlayerMasterlist.query.get(player.masterlist_player_id)
            if masterlist_player and masterlist_player.is_banned:
                continue

        candidates.append({
            'id': player.id,
            'name': player.player_name,
            'mmr': player.mmr,
            'status': player.status
        })

    return jsonify({'players': candidates})

@app.route('/api/replace_player', methods=['POST'])
def api_replace_player():
    """Replace a player in a team with another player"""
    data = request.get_json()
    link_code = data.get('link_code')
    current_player_id = data.get('current_player_id')
    replacement_player_id = data.get('replacement_player_id')

    if not all([link_code, current_player_id, replacement_player_id]):
        return jsonify({'error': 'Missing required parameters'}), 400

    reg_link = RegistrationLink.query.filter_by(link_code=link_code, is_active=True).first()
    if not reg_link:
        return jsonify({'error': 'Invalid link'}), 400

    current_player = Player.query.get(current_player_id)
    replacement_player = Player.query.get(replacement_player_id)

    if not current_player or not replacement_player:
        return jsonify({'error': 'Player not found'}), 404

    # Check if replacement player is banned
    if replacement_player.masterlist_player_id:
        masterlist_player = PlayerMasterlist.query.get(replacement_player.masterlist_player_id)
        if masterlist_player and masterlist_player.is_banned:
            return jsonify({'error': 'Cannot use a banned player as replacement'}), 400

    # Update statuses: current player becomes absent, replacement becomes present
    current_player.status = 'Absent'
    replacement_player.status = 'Present'

    db.session.commit()

    app.logger.info(f'Player replacement: {current_player.player_name} -> {replacement_player.player_name} for event: {reg_link.title}')

    return jsonify({
        'message': 'Player replaced successfully',
        'current_player': current_player.player_name,
        'replacement_player': replacement_player.player_name
    })

# Admin routes
@app.route('/admin/login', methods=['GET', 'POST'])
def admin_login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')

        admin = Admin.query.filter_by(username=username, password=password).first()
        if admin:
            session['admin_id'] = admin.id
            session['admin_username'] = admin.username
            app.logger.info(f'Admin login successful: {username}')
            return redirect(url_for('admin_dashboard'))
        else:
            app.logger.warning(f'Failed admin login attempt for username: {username}')
            flash('Invalid credentials', 'error')

    return render_template('admin_login.html')

@app.route('/admin/dashboard')
def admin_dashboard():
    if 'admin_id' not in session:
        return redirect(url_for('admin_login'))
    
    admin = Admin.query.get(session['admin_id'])
    reg_links = RegistrationLink.query.filter_by(admin_id=admin.id).order_by(RegistrationLink.created_at.desc()).all()
    
    return render_template('admin_dashboard.html', admin=admin, reg_links=reg_links)

# Lobby Routes
@app.route('/admin/lobbies')
def admin_lobbies():
    if 'admin_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401

    admin_id = session['admin_id']
    lobbies = Lobby.query.filter_by(admin_id=admin_id).order_by(Lobby.created_at.desc()).all()

    lobbies_data = []
    for lobby in lobbies:
        lobbies_data.append({
            'id': lobby.id,
            'name': lobby.name,
            'lobby_code': lobby.lobby_code,
            'status': lobby.status,
            'player_count': len(lobby.players),
            'party_count': len(lobby.parties)
        })

    return jsonify({'lobbies': lobbies_data})

@app.route('/admin/lobby/create', methods=['POST'])
def admin_create_lobby():
    if 'admin_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401

    lobby_name = request.form.get('lobby_name')
    if not lobby_name:
        return jsonify({'error': 'Lobby name is required'}), 400

    # Generate unique lobby code
    lobby_code = secrets.token_urlsafe(16)

    new_lobby = Lobby(
        name=lobby_name,
        lobby_code=lobby_code,
        admin_id=session['admin_id']
    )

    db.session.add(new_lobby)
    db.session.commit()

    app.logger.info(f'Lobby created: {lobby_name} (Code: {lobby_code}) by admin {session["admin_username"]}')

    return jsonify({
        'message': 'Lobby created successfully',
        'lobby_code': lobby_code
    })

@app.route('/admin/lobby/<int:lobby_id>/close', methods=['POST'])
def admin_close_lobby(lobby_id):
    if 'admin_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401

    lobby = Lobby.query.get_or_404(lobby_id)

    if lobby.admin_id != session['admin_id']:
        return jsonify({'error': 'Unauthorized'}), 403

    lobby.status = 'closed'
    db.session.commit()

    # Notify all players in lobby via WebSocket
    socketio.emit('lobby_closed', {'message': 'Lobby has been closed by admin'}, room=f'lobby_{lobby.lobby_code}')

    return jsonify({'message': 'Lobby closed successfully'})

@app.route('/admin/lobby/<lobby_code>/manage')
def admin_lobby_manage(lobby_code):
    if 'admin_id' not in session:
        return redirect(url_for('admin_login'))

    lobby = Lobby.query.filter_by(lobby_code=lobby_code).first_or_404()

    if lobby.admin_id != session['admin_id']:
        flash('Unauthorized access to this lobby', 'error')
        return redirect(url_for('admin_dashboard'))

    # Get all players in the lobby
    players = LobbyPlayer.query.filter_by(lobby_id=lobby.id).order_by(LobbyPlayer.joined_at).all()

    # Get all parties in the lobby
    parties = LobbyParty.query.filter_by(lobby_id=lobby.id).order_by(LobbyParty.created_at).all()

    # Get ready parties (status='ready' and exactly 5 members)
    ready_parties = [party for party in parties if party.status == 'ready' and len(party.members) == 5]

    return render_template('admin_lobby.html',
                         lobby=lobby,
                         players=players,
                         parties=parties,
                         ready_parties=ready_parties)

@app.route('/admin/lobby/<lobby_code>/create-bracket', methods=['POST'])
def admin_lobby_create_bracket(lobby_code):
    if 'admin_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401

    lobby = Lobby.query.filter_by(lobby_code=lobby_code).first_or_404()

    if lobby.admin_id != session['admin_id']:
        return jsonify({'error': 'Unauthorized'}), 403

    data = request.get_json()
    bracket_name = data.get('bracket_name')
    party_ids = data.get('party_ids', [])

    if not bracket_name:
        return jsonify({'error': 'Bracket name is required'}), 400

    if len(party_ids) < 2:
        return jsonify({'error': 'At least 2 parties are required'}), 400

    # Verify all parties are ready (5 members each)
    parties = LobbyParty.query.filter(LobbyParty.id.in_(party_ids)).all()

    for party in parties:
        if party.status != 'ready' or len(party.members) != 5:
            return jsonify({'error': f'Party {party.party_name} is not ready'}), 400

    # Create a new lobby bracket
    bracket = LobbyBracket(
        lobby_id=lobby.id,
        bracket_name=bracket_name,
        status='active',
        num_teams=len(party_ids)
    )
    db.session.add(bracket)
    db.session.commit()

    # Create matches for the bracket
    num_teams = len(parties)
    total_rounds = math.ceil(math.log2(num_teams))

    # First round matches
    num_matches_first_round = num_teams // 2

    # Assign parties to first round matches
    for i in range(num_matches_first_round):
        team1_party = parties[i * 2] if i * 2 < len(parties) else None
        team2_party = parties[i * 2 + 1] if i * 2 + 1 < len(parties) else None

        match = LobbyMatch(
            bracket_id=bracket.id,
            round_number=1,
            match_number=i + 1,
            team1_name=team1_party.party_name if team1_party else None,
            team2_name=team2_party.party_name if team2_party else None,
            team1_party_id=team1_party.id if team1_party else None,
            team2_party_id=team2_party.id if team2_party else None
        )
        db.session.add(match)

    # Create placeholder matches for subsequent rounds
    for round_num in range(2, total_rounds + 1):
        num_matches_in_round = 2 ** (total_rounds - round_num)
        for match_num in range(num_matches_in_round):
            match = LobbyMatch(
                bracket_id=bracket.id,
                round_number=round_num,
                match_number=match_num + 1
            )
            db.session.add(match)

    db.session.commit()

    app.logger.info(f'Lobby bracket created: {bracket_name} for lobby {lobby.name} with {num_teams} teams by admin {session["admin_username"]}')

    return jsonify({
        'message': 'Bracket created successfully',
        'bracket_id': bracket.id,
        'redirect_url': url_for('admin_lobby_bracket', lobby_code=lobby_code, bracket_id=bracket.id)
    })

@app.route('/admin/lobby/<lobby_code>/bracket/<int:bracket_id>')
def admin_lobby_bracket(lobby_code, bracket_id):
    if 'admin_id' not in session:
        return redirect(url_for('admin_login'))

    lobby = Lobby.query.filter_by(lobby_code=lobby_code).first_or_404()

    if lobby.admin_id != session['admin_id']:
        flash('Unauthorized access to this lobby', 'error')
        return redirect(url_for('admin_dashboard'))

    bracket = LobbyBracket.query.get_or_404(bracket_id)

    if bracket.lobby_id != lobby.id:
        flash('Invalid bracket for this lobby', 'error')
        return redirect(url_for('admin_lobby_manage', lobby_code=lobby_code))

    # Get all matches for this bracket
    matches = LobbyMatch.query.filter_by(bracket_id=bracket.id).order_by(LobbyMatch.round_number, LobbyMatch.match_number).all()

    return render_template('admin_lobby_bracket.html',
                         lobby=lobby,
                         bracket=bracket,
                         matches=matches)

@app.route('/admin/lobby/match/<int:match_id>/set_winner', methods=['POST'])
def admin_lobby_match_set_winner(match_id):
    if 'admin_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401

    match = LobbyMatch.query.get_or_404(match_id)
    bracket = LobbyBracket.query.get_or_404(match.bracket_id)
    lobby = Lobby.query.get_or_404(bracket.lobby_id)

    if lobby.admin_id != session['admin_id']:
        return jsonify({'error': 'Unauthorized'}), 403

    data = request.get_json()
    winner_name = data.get('winner_name')
    winner_party_id = data.get('winner_party_id')

    if not winner_name:
        return jsonify({'error': 'Winner name is required'}), 400

    # Set the winner for this match
    match.winner_name = winner_name
    match.winner_party_id = winner_party_id
    db.session.commit()

    # Advance winner to next round
    total_rounds = math.ceil(math.log2(bracket.num_teams))

    if match.round_number < total_rounds:
        next_round = match.round_number + 1
        next_match_number = (match.match_number + 1) // 2

        next_match = LobbyMatch.query.filter_by(
            bracket_id=bracket.id,
            round_number=next_round,
            match_number=next_match_number
        ).first()

        if next_match:
            # Determine if winner goes to team1 or team2 in next match
            if match.match_number % 2 == 1:  # Odd match number goes to team1
                next_match.team1_name = winner_name
                next_match.team1_party_id = winner_party_id
            else:  # Even match number goes to team2
                next_match.team2_name = winner_name
                next_match.team2_party_id = winner_party_id

            db.session.commit()

    app.logger.info(f'Match {match_id} winner set to {winner_name} in lobby bracket {bracket.bracket_name}')

    return jsonify({'message': 'Winner set successfully'})

@app.route('/admin/lobby/bracket/<int:bracket_id>/delete', methods=['POST'])
def admin_lobby_bracket_delete(bracket_id):
    if 'admin_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401

    bracket = LobbyBracket.query.get_or_404(bracket_id)
    lobby = Lobby.query.get_or_404(bracket.lobby_id)

    if lobby.admin_id != session['admin_id']:
        return jsonify({'error': 'Unauthorized'}), 403

    # Delete all matches associated with this bracket
    LobbyMatch.query.filter_by(bracket_id=bracket.id).delete()

    # Delete the bracket
    db.session.delete(bracket)
    db.session.commit()

    app.logger.info(f'Lobby bracket {bracket.bracket_name} deleted by admin {session["admin_username"]}')

    return jsonify({'message': 'Bracket deleted successfully'})

@app.route('/admin/lobby/bracket/<int:bracket_id>/champion')
def admin_lobby_bracket_champion(bracket_id):
    if 'admin_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401

    bracket = LobbyBracket.query.get_or_404(bracket_id)
    lobby = Lobby.query.get_or_404(bracket.lobby_id)

    if lobby.admin_id != session['admin_id']:
        return jsonify({'error': 'Unauthorized'}), 403

    # Find the final match (last round)
    total_rounds = math.ceil(math.log2(bracket.num_teams))
    final_match = LobbyMatch.query.filter_by(
        bracket_id=bracket.id,
        round_number=total_rounds
    ).first()

    if final_match and final_match.winner_name:
        # Get the winning party
        winning_party = LobbyParty.query.get(final_match.winner_party_id)

        if winning_party:
            champion_players = []
            for member in winning_party.members:
                champion_players.append({
                    'player_name': member.player_name,
                    'preferred_roles': member.preferred_roles.split(',')
                })

            return jsonify({
                'champion': {
                    'name': final_match.winner_name,
                    'players': champion_players
                }
            })

    return jsonify({'champion': None})

@app.route('/admin/shuffle/<link_code>')
def admin_shuffle(link_code):
    if 'admin_id' not in session:
        return redirect(url_for('admin_login'))

    reg_link = RegistrationLink.query.filter_by(link_code=link_code).first_or_404()
    players = Player.query.filter_by(registration_link_id=reg_link.id).all()

    return render_template('admin_shuffle.html', reg_link=reg_link, players=players)

@app.route('/admin/event/<link_code>/add_player', methods=['POST'])
def admin_add_player_to_event(link_code):
    if 'admin_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401

    reg_link = RegistrationLink.query.filter_by(link_code=link_code).first_or_404()
    
    player_name = request.form.get('player_name')
    mmr = int(request.form.get('mmr'))
    
    new_player = Player(
        player_name=player_name,
        mmr=mmr,
        preferred_roles=json.dumps(['Carry']), # Default role
        registration_link_id=reg_link.id
    )
    db.session.add(new_player)
    db.session.commit()
    
    return jsonify({'message': 'Player added successfully', 'player_id': new_player.id})

@app.route('/admin/event/player/<int:player_id>/edit', methods=['POST'])
def admin_edit_event_player(player_id):
    if 'admin_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401

    player = Player.query.get_or_404(player_id)
    
    player.player_name = request.form.get('player_name')
    player.mmr = int(request.form.get('mmr'))
    
    db.session.commit()
    
    return jsonify({'message': 'Player updated successfully'})

@app.route('/admin/event/player/<int:player_id>/delete', methods=['POST'])
def admin_delete_event_player(player_id):
    if 'admin_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401

    player = Player.query.get_or_404(player_id)
    db.session.delete(player)
    db.session.commit()
    
    return jsonify({'message': 'Player deleted successfully'})

@app.route('/admin/event/player/<int:player_id>/toggle_status', methods=['POST'])
def admin_toggle_player_status(player_id):
    if 'admin_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401

    player = Player.query.get_or_404(player_id)

    if player.status == 'Present':
        player.status = 'Absent'
    else:
        player.status = 'Present'

    db.session.commit()

    return jsonify({'message': 'Player status updated', 'new_status': player.status})

@app.route('/admin/masterlist/<int:player_id>/toggle_ban', methods=['POST'])
def admin_toggle_masterlist_ban(player_id):
    if 'admin_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401

    player = PlayerMasterlist.query.get_or_404(player_id)

    player.is_banned = not player.is_banned
    player.updated_at = datetime.utcnow()
    db.session.commit()

    status = 'banned' if player.is_banned else 'unbanned'
    app.logger.info(f'Player {player.player_name} (ID: {player_id}) {status} by admin {session["admin_username"]}')

    return jsonify({'message': f'Player {status}', 'is_banned': player.is_banned})

@app.route('/admin/create_link', methods=['POST'])
def admin_create_link():
    if 'admin_id' not in session:
        return redirect(url_for('admin_login'))

    title = request.form.get('title')
    description = request.form.get('description')
    unlimited_players = request.form.get('unlimited_players') == 'on'
    max_players = None if unlimited_players else int(request.form.get('max_players', 10))
    opens_at_str = request.form.get('opens_at')
    expires_at_str = request.form.get('expires_at')

    link_code = secrets.token_urlsafe(16)

    # Parse the datetime strings from the form
    opens_at = None
    if opens_at_str:
        try:
            opens_at = datetime.strptime(opens_at_str, '%Y-%m-%dT%H:%M')
        except (ValueError, TypeError):
            flash('Invalid opening date format', 'error')
            return redirect(url_for('admin_dashboard'))

    try:
        expires_at = datetime.strptime(expires_at_str, '%Y-%m-%dT%H:%M')
    except (ValueError, TypeError):
        flash('Invalid expiration date format', 'error')
        return redirect(url_for('admin_dashboard'))

    new_link = RegistrationLink(
        link_code=link_code,
        admin_id=session['admin_id'],
        title=title,
        description=description,
        max_players=max_players,
        opens_at=opens_at,
        expires_at=expires_at
    )

    db.session.add(new_link)
    db.session.commit()

    app.logger.info(f'Registration link created by admin {session["admin_username"]}: {title} ({link_code})')
    flash(f'Registration link created: {request.url_root}register/{link_code}', 'success')
    return redirect(url_for('admin_dashboard'))

@app.route('/admin/link/<int:link_id>/edit', methods=['POST'])
def admin_edit_link(link_id):
    if 'admin_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401

    reg_link = RegistrationLink.query.get_or_404(link_id)

    # Check if admin owns this link
    if reg_link.admin_id != session['admin_id']:
        return jsonify({'error': 'Unauthorized'}), 401

    title = request.form.get('title')
    description = request.form.get('description')
    unlimited_players = request.form.get('unlimited_players') == 'true'
    max_players = None if unlimited_players else int(request.form.get('max_players', 10))
    opens_at_str = request.form.get('opens_at')
    expires_at_str = request.form.get('expires_at')

    # Parse the datetime strings from the form
    opens_at = None
    if opens_at_str:
        try:
            opens_at = datetime.strptime(opens_at_str, '%Y-%m-%dT%H:%M')
        except (ValueError, TypeError):
            return jsonify({'error': 'Invalid opening date format'}), 400

    try:
        expires_at = datetime.strptime(expires_at_str, '%Y-%m-%dT%H:%M')
    except (ValueError, TypeError):
        return jsonify({'error': 'Invalid expiration date format'}), 400

    reg_link.title = title
    reg_link.description = description
    reg_link.max_players = max_players
    reg_link.opens_at = opens_at
    reg_link.expires_at = expires_at

    db.session.commit()

    app.logger.info(f'Registration link edited by admin {session["admin_username"]}: {title} (ID: {link_id})')
    return jsonify({'message': 'Link updated successfully'})

@app.route('/admin/link/<int:link_id>/toggle', methods=['POST'])
def admin_toggle_link(link_id):
    if 'admin_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401

    reg_link = RegistrationLink.query.get_or_404(link_id)

    # Check if admin owns this link
    if reg_link.admin_id != session['admin_id']:
        return jsonify({'error': 'Unauthorized'}), 401

    reg_link.is_active = not reg_link.is_active
    db.session.commit()

    status = 'Open' if reg_link.is_active else 'Closed'
    app.logger.info(f'Registration link toggled by admin {session["admin_username"]}: {reg_link.title} (Status: {status})')
    return jsonify({'message': 'Link status updated', 'is_active': reg_link.is_active})

@app.route('/admin/link/<int:link_id>/delete', methods=['POST'])
def admin_delete_link(link_id):
    if 'admin_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401

    reg_link = RegistrationLink.query.get_or_404(link_id)

    # Check if admin owns this link
    if reg_link.admin_id != session['admin_id']:
        return jsonify({'error': 'Unauthorized'}), 401

    try:
        from sqlalchemy import text

        # Get bracket if it exists
        bracket = Bracket.query.filter_by(registration_link_id=reg_link.id).first()

        if bracket:
            # Delete matches
            Match.query.filter_by(bracket_id=bracket.id).delete()

            # Get team IDs and delete team_players entries
            teams = Team.query.filter_by(bracket_id=bracket.id).all()
            for team in teams:
                team.players.clear()
            db.session.flush()

            # Delete teams
            Team.query.filter_by(bracket_id=bracket.id).delete()

            # Delete bracket
            db.session.delete(bracket)

        # Delete players
        Player.query.filter_by(registration_link_id=reg_link.id).delete()

        # Delete the registration link
        link_title = reg_link.title
        db.session.delete(reg_link)

        db.session.commit()

        app.logger.info(f'Registration link deleted by admin {session["admin_username"]}: {link_title} (ID: {link_id})')

        return jsonify({'message': 'Registration link deleted successfully'})
    except Exception as e:
        db.session.rollback()
        app.logger.error(f'Error deleting registration link {link_id}: {str(e)}')
        return jsonify({'error': 'Failed to delete registration link'}), 500

@app.route('/admin/logout')
def admin_logout():
    admin_username = session.get('admin_username', 'unknown')
    app.logger.info(f'Admin logout: {admin_username}')
    session.clear()
    return redirect(url_for('admin_login'))

# Player Masterlist routes
@app.route('/admin/masterlist')
def admin_masterlist():
    if 'admin_id' not in session:
        return redirect(url_for('admin_login'))
    
    players = PlayerMasterlist.query.order_by(PlayerMasterlist.player_name).all()
    return render_template('admin_masterlist.html', players=players)

@app.route('/admin/masterlist/add', methods=['POST'])
def admin_add_player():
    if 'admin_id' not in session:
        return redirect(url_for('admin_login'))
    
    player_name = request.form.get('player_name')
    real_mmr = int(request.form.get('real_mmr'))
    steam_id = request.form.get('steam_id', '').strip() or None
    notes = request.form.get('notes', '').strip() or None
    
    # Check if player already exists
    existing_player = PlayerMasterlist.query.filter_by(player_name=player_name).first()
    if existing_player:
        flash(f'Player "{player_name}" already exists in masterlist', 'error')
        return redirect(url_for('admin_masterlist'))
    
    try:
        new_player = PlayerMasterlist(
            player_name=player_name,
            real_mmr=real_mmr,
            steam_id=steam_id,
            notes=notes
        )
        db.session.add(new_player)
        db.session.commit()
        flash(f'Player "{player_name}" added to masterlist successfully', 'success')
    except Exception as e:
        flash('Failed to add player to masterlist', 'error')
    
    return redirect(url_for('admin_masterlist'))

@app.route('/admin/masterlist/edit/<int:player_id>', methods=['POST'])
def admin_edit_player(player_id):
    if 'admin_id' not in session:
        return redirect(url_for('admin_login'))
    
    player = PlayerMasterlist.query.get_or_404(player_id)
    
    player_name = request.form.get('player_name')
    real_mmr = int(request.form.get('real_mmr'))
    steam_id = request.form.get('steam_id', '').strip() or None
    notes = request.form.get('notes', '').strip() or None
    
    # Check if another player with same name exists
    existing_player = PlayerMasterlist.query.filter(
        PlayerMasterlist.player_name == player_name,
        PlayerMasterlist.id != player_id
    ).first()
    if existing_player:
        flash(f'Another player with name "{player_name}" already exists', 'error')
        return redirect(url_for('admin_masterlist'))
    
    try:
        player.player_name = player_name
        player.real_mmr = real_mmr
        player.steam_id = steam_id
        player.notes = notes
        player.updated_at = datetime.utcnow()
        
        db.session.commit()
        flash(f'Player "{player_name}" updated successfully', 'success')
    except Exception as e:
        flash('Failed to update player', 'error')
    
    return redirect(url_for('admin_masterlist'))

@app.route('/admin/masterlist/delete/<int:player_id>', methods=['POST'])
def admin_delete_player(player_id):
    if 'admin_id' not in session:
        return redirect(url_for('admin_login'))
    
    player = PlayerMasterlist.query.get_or_404(player_id)
    player_name = player.player_name
    
    try:
        db.session.delete(player)
        db.session.commit()
        flash(f'Player "{player_name}" deleted from masterlist', 'success')
    except Exception as e:
        flash('Failed to delete player', 'error')
    
    return redirect(url_for('admin_masterlist'))

import math

@app.route('/admin/bracket/<link_code>')
def admin_bracket(link_code):
    if 'admin_id' not in session:
        return redirect(url_for('admin_login'))

    reg_link = RegistrationLink.query.filter_by(link_code=link_code).first_or_404()

    bracket = Bracket.query.filter_by(registration_link_id=reg_link.id).first()
    if not bracket:
        players = Player.query.filter_by(registration_link_id=reg_link.id, status='Present').all()

        num_teams = len(players) // 5
        if num_teams < 2:
            app.logger.warning(f'Bracket creation attempted with insufficient teams ({num_teams}) for event: {reg_link.title}')
            flash('Not enough teams to create a bracket (minimum 2 teams)', 'error')
            return redirect(url_for('admin_shuffle', link_code=link_code))

        # Get shuffled teams from the API
        shuffled_teams_data = api_shuffle_teams(link_code).get_json() # This now returns raw player lists

        bracket = Bracket(registration_link_id=reg_link.id, num_teams=num_teams)
        db.session.add(bracket)
        db.session.commit()

        app.logger.info(f'Bracket created for event: {reg_link.title} with {num_teams} teams')

        # Create Team objects and associate players
        team_names_for_matches = []
        for team_data in shuffled_teams_data['teams']:
            new_team = Team(bracket_id=bracket.id, name=team_data['name'])
            db.session.add(new_team)
            db.session.flush() # To get the new_team.id

            for player_data in team_data['players']:
                player = db.session.get(Player, player_data['id'])
                if player: # Ensure player exists
                    # Check if player is not already in this team
                    if player not in new_team.players:
                        new_team.players.append(player)
            team_names_for_matches.append(new_team.name)

        # Commit all teams at once
        db.session.commit()

        # Create matches for all rounds
        total_rounds = math.ceil(math.log2(num_teams))
        
        num_matches_in_round = num_teams // 2
        for i in range(1, total_rounds + 1):
            for j in range(num_matches_in_round):
                match = Match(
                    bracket_id=bracket.id,
                    round_number=i,
                    match_number=j + 1
                )
                db.session.add(match)
            if num_matches_in_round > 1:
                num_matches_in_round //= 2
        db.session.commit()

        # Populate the first round with the stored team names
        first_round_matches = Match.query.filter_by(bracket_id=bracket.id, round_number=1).all()
        random.shuffle(team_names_for_matches)
        
        for i, match in enumerate(first_round_matches):
            match.team1_name = team_names_for_matches[i*2]
            if i*2+1 < len(team_names_for_matches):
                match.team2_name = team_names_for_matches[i*2+1]
        db.session.commit()

    matches = Match.query.filter_by(bracket_id=bracket.id).order_by(Match.round_number, Match.match_number).all()
    
    rounds = {}
    for match in matches:
        if match.round_number not in rounds:
            rounds[match.round_number] = []
        rounds[match.round_number].append(match)
    
    return render_template('admin_bracket.html', reg_link=reg_link, bracket=bracket, rounds=rounds)

@app.route('/admin/match/<int:match_id>/set_winner', methods=['POST'])
def set_winner(match_id):
    if 'admin_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401

    match = Match.query.get_or_404(match_id)
    winner_name = request.form.get('winner_name')

    if winner_name not in [match.team1_name, match.team2_name]:
        app.logger.warning(f'Invalid winner selection for match {match_id}: {winner_name}')
        return jsonify({'error': 'Invalid winner'}), 400

    match.winner_name = winner_name
    db.session.commit()

    app.logger.info(f'Match winner set - Match ID: {match_id}, Winner: {winner_name}, Round: {match.round_number}')

    # --- Advance winner to the next round ---
    bracket = match.bracket
    next_round_number = match.round_number + 1
    next_match_number = math.ceil(match.match_number / 2)
    
    next_match = Match.query.filter_by(
        bracket_id=bracket.id, 
        round_number=next_round_number, 
        match_number=next_match_number
    ).first()

    if next_match:
        if match.match_number % 2 != 0: # If it's the first match of the pair
            next_match.team1_name = winner_name
        else:
            next_match.team2_name = winner_name
        db.session.commit()
        return jsonify({'message': 'Winner set successfully'})
    else:
        # This is the final match
        champion_team_obj = Team.query.filter_by(bracket_id=bracket.id, name=winner_name).first()

        if champion_team_obj:
            app.logger.info(f'Tournament champion declared: {winner_name} (Bracket ID: {bracket.id})')
            champion_players_data = []
            # Get only 5 players sorted by MMR
            sorted_players = sorted(champion_team_obj.players, key=lambda p: p.mmr, reverse=True)[:5]
            for player in sorted_players:
                champion_players_data.append({
                    'id': player.id,
                    'name': player.player_name,
                    'mmr': player.mmr,
                    'roles': json.loads(player.preferred_roles)
                })

            champion_team_data = {
                'name': champion_team_obj.name,
                'players': champion_players_data
            }
            return jsonify({'champion': champion_team_data})
        else:
            app.logger.error(f'Champion team not found in database: {winner_name} (Bracket ID: {bracket.id})')
            return jsonify({'error': 'Champion team not found in database.'}), 404

@app.route('/admin/bracket/<int:bracket_id>/champion')
def get_champion(bracket_id):
    if 'admin_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401

    bracket = Bracket.query.get_or_404(bracket_id)

    # Get the final match
    total_rounds = math.ceil(math.log2(bracket.num_teams))
    final_match = Match.query.filter_by(bracket_id=bracket.id, round_number=total_rounds).first()

    if final_match and final_match.winner_name:
        champion_team_obj = Team.query.filter_by(bracket_id=bracket.id, name=final_match.winner_name).first()

        if champion_team_obj:
            champion_players_data = []
            # Get only 5 players sorted by MMR
            sorted_players = sorted(champion_team_obj.players, key=lambda p: p.mmr, reverse=True)[:5]
            for player in sorted_players:
                champion_players_data.append({
                    'id': player.id,
                    'name': player.player_name,
                    'mmr': player.mmr,
                    'roles': json.loads(player.preferred_roles)
                })

            champion_team_data = {
                'name': champion_team_obj.name,
                'players': champion_players_data
            }
            return jsonify({'champion': champion_team_data})

    return jsonify({'champion': None})

@app.route('/admin/bracket/<int:bracket_id>/reshuffle', methods=['POST'])
def reshuffle_bracket(bracket_id):
    if 'admin_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401

    bracket = Bracket.query.get_or_404(bracket_id)
    
    first_round_matches = Match.query.filter_by(bracket_id=bracket.id, round_number=1).all()
    if any(match.winner_name for match in first_round_matches):
        return jsonify({'error': 'Cannot re-shuffle after winners have been declared.'}), 400

    teams = []
    for match in first_round_matches:
        if match.team1_name:
            teams.append(match.team1_name)
        if match.team2_name:
            teams.append(match.team2_name)
    
    random.shuffle(teams)
    
    for i, match in enumerate(first_round_matches):
        match.team1_name = teams[i*2]
        if i*2+1 < len(teams):
            match.team2_name = teams[i*2+1]
        else:
            match.team2_name = None
    
    db.session.commit()
    
    return jsonify({'message': 'Matchups re-shuffled successfully'})

@app.route('/admin/bracket/<int:bracket_id>/delete', methods=['POST'])
def delete_bracket(bracket_id):
    if 'admin_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401

    bracket = Bracket.query.get_or_404(bracket_id)
    event_title = bracket.registration_link.title

    try:
        from sqlalchemy import text

        # Delete matches
        Match.query.filter_by(bracket_id=bracket.id).delete()

        # Get team IDs for this bracket
        team_ids = [team.id for team in Team.query.filter_by(bracket_id=bracket.id).all()]

        # Delete team_players entries manually
        if team_ids:
            placeholders = ','.join(['?' for _ in team_ids])
            db.session.execute(
                text(f'DELETE FROM team_players WHERE team_id IN ({placeholders})'),
                team_ids
            )

        # Delete teams
        Team.query.filter_by(bracket_id=bracket.id).delete()

        # Delete bracket
        db.session.delete(bracket)

        db.session.commit()

        # Expire all objects to prevent ID conflicts when creating new bracket
        db.session.expire_all()

        app.logger.info(f'Bracket deleted by admin {session["admin_username"]} - Event: {event_title}, Bracket ID: {bracket_id}')

        return jsonify({'message': 'Bracket deleted successfully'})
    except Exception as e:
        db.session.rollback()
        app.logger.error(f'Error deleting bracket {bracket_id}: {str(e)}')
        return jsonify({'error': 'Failed to delete bracket'}), 500

@app.route('/api/saved_shuffles/<link_code>')
def get_saved_shuffles(link_code):
    if 'admin_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401

    reg_link = RegistrationLink.query.filter_by(link_code=link_code).first_or_404()
    
    saved_brackets = Bracket.query.filter_by(registration_link_id=reg_link.id).order_by(Bracket.created_at.desc()).all()
    
    shuffles_data = []
    for bracket in saved_brackets:
        shuffles_data.append({
            'id': bracket.id,
            'created_at': bracket.created_at.strftime('%Y-%m-%d %H:%M'),
            'num_teams': bracket.num_teams
        })
    
    return jsonify({'shuffles': shuffles_data})

@app.route('/api/load_shuffle/<int:bracket_id>')
def load_shuffle(bracket_id):
    if 'admin_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401

    bracket = Bracket.query.get_or_404(bracket_id)
    
    teams_data = []
    for team_obj in bracket.teams:
        players_data = []
        for player in team_obj.players:
            players_data.append({
                'id': player.id,
                'name': player.player_name,
                'mmr': player.mmr,
                'roles': json.loads(player.preferred_roles)
            })
        teams_data.append({
            'id': team_obj.id,
            'name': team_obj.name,
            'players': sorted(players_data, key=lambda x: x['mmr'], reverse=True),
            'avg_mmr': round(sum(p['mmr'] for p in players_data) / len(players_data)) if players_data else 0
        })
    
    return jsonify({'teams': sorted(teams_data, key=lambda x: x['avg_mmr'], reverse=True)})

# Player Lobby Routes
@app.route('/lobby/<lobby_code>')
def lobby_join(lobby_code):
    lobby = Lobby.query.filter_by(lobby_code=lobby_code).first()
    if not lobby:
        flash('Invalid lobby code', 'error')
        return redirect(url_for('index'))

    if lobby.status != 'active':
        flash('This lobby is closed', 'error')
        return redirect(url_for('index'))

    return render_template('lobby.html', lobby=lobby)

@app.route('/api/lobby/<lobby_code>/join', methods=['POST'])
def api_lobby_join(lobby_code):
    lobby = Lobby.query.filter_by(lobby_code=lobby_code, status='active').first()
    if not lobby:
        return jsonify({'error': 'Invalid or closed lobby'}), 400

    player_name = request.json.get('player_name')
    mmr = request.json.get('mmr')
    preferred_roles = request.json.get('preferred_roles', [])

    if not player_name or not mmr or not preferred_roles:
        return jsonify({'error': 'Player name, MMR, and roles are required'}), 400

    if len(preferred_roles) != 2:
        return jsonify({'error': 'Please select exactly 2 roles'}), 400

    # Check if player already joined
    existing = LobbyPlayer.query.filter_by(lobby_id=lobby.id, player_name=player_name).first()
    if existing:
        return jsonify({'error': 'You have already joined this lobby', 'player_id': existing.id}), 200

    new_player = LobbyPlayer(
        lobby_id=lobby.id,
        player_name=player_name,
        mmr=mmr,
        preferred_roles=','.join(preferred_roles)
    )

    db.session.add(new_player)
    db.session.commit()

    # Broadcast new player to lobby
    socketio.emit('player_joined', {
        'id': new_player.id,
        'player_name': player_name,
        'mmr': mmr,
        'preferred_roles': preferred_roles,
        'status': 'waiting'
    }, room=f'lobby_{lobby_code}')

    return jsonify({'message': 'Joined lobby successfully', 'player_id': new_player.id})

# WebSocket Events
@socketio.on('join_lobby')
def handle_join_lobby(data):
    lobby_code = data.get('lobby_code')
    join_room(f'lobby_{lobby_code}')

    # Send current lobby state
    lobby = Lobby.query.filter_by(lobby_code=lobby_code).first()
    if lobby:
        # Get all party leaders for easier checking
        party_leaders = {party.leader_id for party in lobby.parties}

        players_data = [{
            'id': p.id,
            'player_name': p.player_name,
            'mmr': p.mmr,
            'preferred_roles': p.preferred_roles.split(','),
            'status': p.status,
            'is_party_leader': p.id in party_leaders,
            'party_id': p.party[0].id if p.party else None
        } for p in lobby.players]

        parties_data = []
        for party in lobby.parties:
            party_members = [{
                'id': m.id,
                'player_name': m.player_name,
                'mmr': m.mmr,
                'preferred_roles': m.preferred_roles.split(',')
            } for m in party.members]

            parties_data.append({
                'id': party.id,
                'party_name': party.party_name,
                'leader_id': party.leader_id,
                'members': party_members,
                'status': party.status
            })

        emit('lobby_state', {
            'players': players_data,
            'parties': parties_data
        })

@socketio.on('create_party')
def handle_create_party(data):
    player_id = data.get('player_id')
    lobby_code = data.get('lobby_code')

    player = LobbyPlayer.query.get(player_id)
    if not player:
        emit('error', {'message': 'Player not found'})
        return

    # Check if player is already in a party
    if player.party:
        emit('error', {'message': 'You are already in a party'})
        return

    party = LobbyParty(
        lobby_id=player.lobby_id,
        party_name=f"{player.player_name}'s Party",
        leader_id=player_id
    )

    db.session.add(party)
    db.session.flush()

    # Add leader to party
    party.members.append(player)
    player.status = 'in_party'

    db.session.commit()

    # Broadcast party creation
    socketio.emit('party_created', {
        'id': party.id,
        'party_name': party.party_name,
        'leader_id': player_id,
        'members': [{
            'id': player.id,
            'player_name': player.player_name,
            'mmr': player.mmr,
            'preferred_roles': player.preferred_roles.split(',')
        }],
        'status': party.status
    }, room=f'lobby_{lobby_code}')

@socketio.on('send_invite')
def handle_send_invite(data):
    party_id = data.get('party_id')
    from_player_id = data.get('from_player_id')
    to_player_id = data.get('to_player_id')
    lobby_code = data.get('lobby_code')

    party = LobbyParty.query.get(party_id)
    if not party or party.leader_id != from_player_id:
        emit('error', {'message': 'Only party leader can send invites'})
        return

    # Check if party is full
    if len(party.members) >= 5:
        emit('error', {'message': 'Party is full'})
        return

    # Check if player is already invited or in party
    existing_invite = PartyInvite.query.filter_by(
        party_id=party_id,
        to_player_id=to_player_id,
        status='pending'
    ).first()

    if existing_invite:
        emit('error', {'message': 'Player already has a pending invite'})
        return

    to_player = LobbyPlayer.query.get(to_player_id)
    if to_player.status != 'waiting':
        emit('error', {'message': 'Player is not available'})
        return

    invite = PartyInvite(
        party_id=party_id,
        from_player_id=from_player_id,
        to_player_id=to_player_id
    )

    db.session.add(invite)
    db.session.commit()

    from_player = LobbyPlayer.query.get(from_player_id)

    # Send invite to specific player
    socketio.emit('invite_received', {
        'invite_id': invite.id,
        'party_id': party_id,
        'party_name': party.party_name,
        'from_player': from_player.player_name,
        'to_player_id': to_player_id
    }, room=f'lobby_{lobby_code}')

@socketio.on('request_join_party')
def handle_request_join_party(data):
    party_id = data.get('party_id')
    player_id = data.get('player_id')
    lobby_code = data.get('lobby_code')

    party = LobbyParty.query.get(party_id)
    if not party:
        emit('error', {'message': 'Party not found'})
        return

    player = LobbyPlayer.query.get(player_id)
    if not player:
        emit('error', {'message': 'Player not found'})
        return

    # Check if party is full
    if len(party.members) >= 5:
        emit('error', {'message': 'Party is full'})
        return

    # Check if player is already in a party
    if player.status != 'waiting':
        emit('error', {'message': 'You are already in a party'})
        return

    # Check for existing pending request
    existing_invite = PartyInvite.query.filter_by(
        party_id=party_id,
        to_player_id=player_id,
        status='pending'
    ).first()

    if existing_invite:
        emit('error', {'message': 'You already have a pending request for this party'})
        return

    # Create join request (stored as invite from player to party leader)
    join_request = PartyInvite(
        party_id=party_id,
        from_player_id=player_id,  # Player requesting
        to_player_id=party.leader_id  # Send to leader
    )
    db.session.add(join_request)
    db.session.commit()

    # Notify party leader
    socketio.emit('join_request_received', {
        'request_id': join_request.id,
        'party_id': party_id,
        'party_name': party.party_name,
        'player_id': player_id,
        'player_name': player.player_name,
        'leader_id': party.leader_id
    }, room=f'lobby_{lobby_code}')

@socketio.on('respond_invite')
def handle_respond_invite(data):
    invite_id = data.get('invite_id')
    accepted = data.get('accepted')
    lobby_code = data.get('lobby_code')

    invite = PartyInvite.query.get(invite_id)
    if not invite or invite.status != 'pending':
        emit('error', {'message': 'Invalid invite'})
        return

    if accepted:
        party = LobbyParty.query.get(invite.party_id)

        # Determine if this is a regular invite or join request
        # If to_player is the leader, then from_player is requesting to join
        # If from_player is the leader, then to_player is being invited
        if invite.to_player_id == party.leader_id:
            # Join request: from_player wants to join
            player = LobbyPlayer.query.get(invite.from_player_id)
        else:
            # Regular invite: to_player is being invited
            player = LobbyPlayer.query.get(invite.to_player_id)

        if len(party.members) >= 5:
            invite.status = 'declined'
            db.session.commit()
            emit('error', {'message': 'Party is now full'})
            return

        # Check if player is already in the party
        if player in party.members:
            invite.status = 'declined'
            db.session.commit()
            emit('error', {'message': 'Player is already in the party'})
            return

        party.members.append(player)
        player.status = 'in_party'
        invite.status = 'accepted'

        # Check if party is full
        if len(party.members) == 5:
            party.status = 'ready'

        db.session.commit()

        # Broadcast party update
        members_data = [{
            'id': m.id,
            'player_name': m.player_name,
            'mmr': m.mmr,
            'preferred_roles': m.preferred_roles.split(',')
        } for m in party.members]

        socketio.emit('party_updated', {
            'party_id': party.id,
            'members': members_data,
            'status': party.status
        }, room=f'lobby_{lobby_code}')

        socketio.emit('invite_accepted', {
            'invite_id': invite_id,
            'player_id': player.id,
            'party_id': party.id
        }, room=f'lobby_{lobby_code}')

        # Broadcast notification
        socketio.emit('party_notification', {
            'message': f'{player.player_name} joined {party.party_name}',
            'type': 'success'
        }, room=f'lobby_{lobby_code}')

    else:
        invite.status = 'declined'
        db.session.commit()

        # Get player name for notification
        from_player = LobbyPlayer.query.get(invite.from_player_id)
        to_player = LobbyPlayer.query.get(invite.to_player_id)

        socketio.emit('invite_declined', {
            'invite_id': invite_id,
            'player_id': invite.to_player_id
        }, room=f'lobby_{lobby_code}')

        # Broadcast notification
        socketio.emit('party_notification', {
            'message': f'{to_player.player_name} declined invitation',
            'type': 'info'
        }, room=f'lobby_{lobby_code}')

@socketio.on('leave_party')
def handle_leave_party(data):
    player_id = data.get('player_id')
    lobby_code = data.get('lobby_code')

    player = LobbyPlayer.query.get(player_id)
    if not player or not player.party:
        emit('error', {'message': 'Not in a party'})
        return

    party = player.party[0]  # Get first party (player can only be in one party)

    # If leader leaves, disband party
    if party.leader_id == player_id:
        # Remove all members and delete party
        for member in party.members:
            member.status = 'waiting'

        # Delete all pending invites for this party
        PartyInvite.query.filter_by(party_id=party.id).delete()

        db.session.delete(party)
        db.session.commit()

        socketio.emit('party_disbanded', {
            'party_id': party.id
        }, room=f'lobby_{lobby_code}')
    else:
        # Remove player from party
        party.members.remove(player)
        player.status = 'waiting'
        db.session.commit()

        members_data = [{
            'id': m.id,
            'player_name': m.player_name,
            'mmr': m.mmr,
            'preferred_roles': m.preferred_roles.split(',')
        } for m in party.members]

        socketio.emit('party_updated', {
            'party_id': party.id,
            'members': members_data,
            'status': 'forming' if len(party.members) < 5 else 'ready'
        }, room=f'lobby_{lobby_code}')

        # Broadcast notification
        socketio.emit('party_notification', {
            'message': f'{player.player_name} left {party.party_name}',
            'type': 'info'
        }, room=f'lobby_{lobby_code}')

@socketio.on('disband_party')
def handle_disband_party(data):
    party_id = data.get('party_id')
    lobby_code = data.get('lobby_code')

    party = LobbyParty.query.get(party_id)
    if not party:
        emit('error', {'message': 'Party not found'})
        return

    # Remove all members from party and set them to waiting
    for member in party.members:
        member.status = 'waiting'

    # Delete all pending invites for this party
    PartyInvite.query.filter_by(party_id=party.id).delete()

    # Delete the party
    db.session.delete(party)
    db.session.commit()

    # Broadcast party disbanded
    socketio.emit('party_disbanded', {
        'party_id': party_id
    }, room=f'lobby_{lobby_code}')

@socketio.on('mark_party_ready')
def handle_mark_party_ready(data):
    party_id = data.get('party_id')
    lobby_code = data.get('lobby_code')

    party = LobbyParty.query.get(party_id)
    if not party:
        emit('error', {'message': 'Party not found'})
        return

    # Check if party has 5 members
    if len(party.members) != 5:
        emit('error', {'message': 'Party must have exactly 5 members to be ready'})
        return

    # Mark party as ready
    party.status = 'ready'
    db.session.commit()

    # Broadcast party updated
    members_data = [{
        'id': m.id,
        'player_name': m.player_name,
        'mmr': m.mmr,
        'preferred_roles': m.preferred_roles.split(',')
    } for m in party.members]

    socketio.emit('party_updated', {
        'party_id': party.id,
        'members': members_data,
        'status': 'ready'
    }, room=f'lobby_{lobby_code}')

    # Broadcast notification
    socketio.emit('party_notification', {
        'message': f'{party.party_name} is now ready!',
        'type': 'success'
    }, room=f'lobby_{lobby_code}')

@socketio.on('kick_member')
def handle_kick_member(data):
    player_id = data.get('player_id')
    party_id = data.get('party_id')
    lobby_code = data.get('lobby_code')

    party = LobbyParty.query.get(party_id)
    if not party:
        emit('error', {'message': 'Party not found'})
        return

    player = LobbyPlayer.query.get(player_id)
    if not player:
        emit('error', {'message': 'Player not found'})
        return

    # Cannot kick the party leader
    if player.id == party.leader_id:
        emit('error', {'message': 'Cannot kick the party leader'})
        return

    # Remove player from party
    if player in party.members:
        party.members.remove(player)
        player.status = 'waiting'
        db.session.commit()

        # Broadcast party updated
        members_data = [{
            'id': m.id,
            'player_name': m.player_name,
            'mmr': m.mmr,
            'preferred_roles': m.preferred_roles.split(',')
        } for m in party.members]

        socketio.emit('party_updated', {
            'party_id': party.id,
            'members': members_data,
            'status': 'forming' if len(party.members) < 5 else 'ready'
        }, room=f'lobby_{lobby_code}')

        # Broadcast notification
        socketio.emit('party_notification', {
            'message': f'{player.player_name} was kicked from {party.party_name}',
            'type': 'warning'
        }, room=f'lobby_{lobby_code}')

# Initialize database
def create_tables():
    db.create_all()
    
    # Create default admin if none exists
    if not Admin.query.first():
        default_admin = Admin(username='admin', password='admin123')
        db.session.add(default_admin)
        db.session.commit()
        print("Default admin created: username='admin', password='admin123'")

def init_database():
    """Initialize database with proper schema"""
    with app.app_context():
        # Run migrations first to handle schema changes
        migrate_database()
        
        # Create tables if they don't exist (preserves existing data)
        db.create_all()
        
        # Create default admin if none exists
        if not Admin.query.first():
            default_admin = Admin(username='admin', password='admin123')
            db.session.add(default_admin)
            db.session.commit()
            print("Default admin created: username='admin', password='admin123'")
        
        print("Database initialized successfully!")

if __name__ == '__main__':
    init_database()
    socketio.run(app, debug=True)
