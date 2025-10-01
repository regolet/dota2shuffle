from flask import Flask, render_template, request, redirect, url_for, flash, jsonify, session
from flask_sqlalchemy import SQLAlchemy
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
        # Use real MMR from masterlist
        final_mmr = masterlist_player.real_mmr
        masterlist_player_id = masterlist_player.id
        flash(f'Welcome back {player_name}! Using your registered MMR: {final_mmr}', 'info')
    else:
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

    players = Player.query.filter_by(registration_link_id=reg_link.id, status='Present').all()
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
    app.run(debug=True)
