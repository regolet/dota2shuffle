# Dota 2 Shuffle

A web application for creating balanced Dota 2 teams through player registration and automatic team shuffling.

## Features

- **Player Registration**: Players can register with their Steam ID, MMR, and preferred role
- **Admin Dashboard**: Create and manage registration links for tournaments/events
- **Team Shuffling**: Automatically create balanced teams based on MMR and roles
- **SQLite Database**: Lightweight database for storing player and event data
- **Responsive Design**: Modern UI that works on desktop and mobile devices

## Setup Instructions

### Prerequisites

- Python 3.7 or higher
- pip (Python package installer)

### Installation

1. **Clone or download the project files**

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the application**:
   ```bash
   python app.py
   ```

4. **Access the application**:
   - Main site: http://localhost:5000
   - Admin login: http://localhost:5000/admin/login
   - Default admin credentials: `admin` / `admin123`

## Usage

### For Administrators

1. **Login to Admin Dashboard**:
   - Go to http://localhost:5000/admin/login
   - Use default credentials: `admin` / `admin123`
   - **Important**: Change the default password in production!

2. **Create Registration Links**:
   - Fill out the "Create Registration Link" form
   - Set event title, description, max players, and expiration time
   - Copy the generated registration link to share with players

3. **Monitor Registrations**:
   - View all created links and their status
   - See how many players have registered for each event
   - Access the shuffle page for any event

### For Players

1. **Register for an Event**:
   - Use the registration link provided by the administrator
   - Enter your Steam ID, player name, MMR, and preferred role
   - Steam ID can be found at steamid.io

2. **Participate in Team Shuffle**:
   - After registration, you'll be redirected to the shuffle page
   - Wait for other players to register
   - Click "Shuffle Teams" when ready to create balanced teams

## Database Schema

The application uses SQLite with the following tables:

- **Admin**: Administrator accounts
- **RegistrationLink**: Event registration links created by admins
- **Player**: Registered players with their details

## Security Notes

- Change the default admin password before deploying to production
- Update the Flask secret key in `app.py`
- Consider using environment variables for sensitive configuration
- The application is designed for local/private use

## Customization

- Modify the shuffle algorithm in `app.py` for different balancing strategies
- Update CSS in `static/style.css` for custom styling
- Add additional player fields by modifying the database models

## Troubleshooting

- **Database issues**: Delete `dota2shuffle.db` to reset the database
- **Port conflicts**: Change the port in `app.run(debug=True, port=5001)` if needed
- **Dependencies**: Ensure all packages in `requirements.txt` are installed

## License

This project is open source and available under the MIT License.
