from dotenv import load_dotenv
load_dotenv()

from flask import Flask, jsonify, redirect, render_template, request, session, url_for
from flask_sqlalchemy import SQLAlchemy
import bcrypt
import psycopg2
import os

# Create Flask App
app = Flask(__name__)

# Store Session key
app.secret_key = os.getenv('SESSION_KEY').encode('utf8')

# Create SQLite database
# app.config.from_object(os.environ['APP_SETTINGS'])
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

#conn = psycopg2.connect(DATABASE_URL, sslmode='require')

# Link SQL database with Flask app
db = SQLAlchemy(app)

''' MODELS '''

class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(), nullable=False, unique=True)
    password = db.Column(db.String(), nullable=False)
    cards = db.relationship("Card", backref="user", lazy=True)

    def delete_account(self):
        try:
            user_id = self.id
            for card in self.cards:
                db.session.delete(card)
                
            db.session.delete(self)
            db.session.commit()
            return user_id
        except Exception as e:
            print('Exception while deleting card: ', e)
            return False

    def add_card(self, card_name, card_content, card_stage, card_position):
        try:
            card = Card(name=card_name, content=card_content,
                        stage=card_stage, position=card_position, user_id=self.id)
            db.session.add(card)
            db.session.commit()
            return getattr(card, 'id')
        except Exception as e:
            print('Exception while adding card: ', e)
            return False

    def delete_card(self, card_id):
        try:
            #Find a card
            card = Card.query.get(card_id)
            #Validate the card is owned by the user
            if card.user_id != self.id:
                print(f'User: {self.id}, failed to update a card that does not belong to them.')
                return False
            #Delete the card 
            db.session.delete(card)
            db.session.commit()
            return card_id
        except Exception as e:
            print('Exception while deleting card: ', e)
            return False

    def update_card_content(self, card_id, card_name, card_content):
        try:
            #Find a card
            card = Card.query.get(card_id)
            #Validate the card is owned by the user
            if card.user_id != self.id:
                print(f'User: {self.id}, failed to update a card that does not belong to them.')
                return False
            #Update card's name & content 
            card.name = card_name
            card.content = card_content
            db.session.commit()
            return card_id
        except Exception as e:
            print('Exception while updating card: ', e)
            return False

    def update_card_position(self, card_id, card_stage, card_position):
        try:
            #Find a card
            card = Card.query.get(card_id)
            #Validate the card is owned by the user
            if card.user_id != self.id:
                print(f'User: {self.id}, failed to update a card that does not belong to them.')
                return False
            #Update card's stage & position
            card.stage = card_stage
            card.position = card_position
            db.session.commit()
            return card_id
        except Exception as e:
            print('Exception while updating card: ', e)
            return False

    def get_cards(self):
        # Return all cards of the user as a Dictionaryy with card's ids as keys
        user_cards = {}
        for card in self.cards:
            user_cards[card.id] = {
                'name': card.name,
                'content': card.content,
                'stage': card.stage,
                'position': card.position
            }
        return user_cards

class Card(db.Model):
    __tablename__ = "cards"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(), nullable=False)
    content = db.Column(db.String(), nullable=False)
    stage = db.Column(db.Integer, nullable=False)
    position = db.Column(db.Float, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)

''' ROUTES '''

def main():
    @app.route('/')
    def indexRoute():
        return render_template('index.html')

    @app.route('/kanban')
    def kanbanRoute():
        author = authorise()
        if author:
            # Fetch cards in each of the stages
            todo = Card.query.filter_by(
                stage=0, user_id=author.id).order_by(Card.position).all()
            progress = Card.query.filter_by(
                stage=1, user_id=author.id).order_by(Card.position).all()
            done = Card.query.filter_by(
                stage=2, user_id=author.id).order_by(Card.position).all()
            # Render kanban board
            return render_template('kanban.html', username=author.name, todo=todo, progress=progress, done=done)
        # If request is not authorised, redirect user
        return redirect('/')

    @app.route('/auth/<route>', methods=['GET', 'POST'])
    def authRoute(route):
        """Catches login, logout and register requests."""
        if route == 'logout':
            return logout()
        elif request.method == 'POST':
            # Get username and password
            user_name = request.form.get('name').lower().strip()
            user_password = request.form.get('password')

            # Call appropiate auth function
            if route == 'login':
                return login(user_name, user_password)
            elif route == 'register':
                return register(user_name, user_password)
        elif route == 'login' or route == 'register':
            # Render appropiate auth form
            return render_template('auth.html', route=route)
        return redirect('/')

    @app.route('/account', methods=['DELETE'])
    def deleteAccountRoute():
        author = authorise()
        if author:
            user_id = author.delete_account()
            if user_id:
                    return str(user_id)
            # If deleting the user failed...
            return "Couldn't delete user from database", 500
        # If request is not authorised, redirect user
        return redirect('/')

    @app.route('/cards', methods=['GET', 'POST', 'PUT', 'DELETE'])
    def cardsRoute():
        author = authorise()
        if author:
            # CREATE CARD
            if request.method == 'POST':
                # Get form data
                json_data = request.get_json()

                # Validate input
                error = validateCard(
                    'newCard',
                    name=json_data['name'],
                    content=json_data['content'],
                    stage=json_data['stage'],
                    position=json_data['position'])
                if error:
                    # If error, print error message in the client
                    return error, 400

                # Add card
                card_id = author.add_card(
                    card_name=json_data['name'],
                    card_content=json_data['content'],
                    card_stage=json_data['stage'],
                    card_position=json_data['position']
                )
                if card_id:
                    return str(card_id)

                # If adding the card failed...
                return "Couldn't add card to database", 500
            # UPDATE CARD
            elif request.method == 'PUT':
                # Get form data
                json_data = request.get_json()

                # Validate input
                error = validateCard(
                    'updateContent', name=json_data['name'], content=json_data['content'])
                if error:
                    # If error, print error message in the client
                    return error, 400

                # Update card
                card_id = author.update_card_content(
                    card_id=json_data['id'],
                    card_name=json_data['name'],
                    card_content=json_data['content']
                )
                if card_id:
                    return str(card_id)

                # If updating the card failed...
                return "Couldn't update card in the database", 500
            # DELETE CARD
            elif request.method == 'DELETE':
                # Get form data
                json_data = request.get_json()

                # Delete card
                card_id = author.delete_card(json_data['id'])
                if card_id:
                    return str(card_id)

                # If deleting the card failed...
                return "Couldn't delete card from database", 500
            # READ CARD
            # Send all cards that belong to this user
            cards = author.get_cards()
            return jsonify(cards)
        # If request is not authorised, redirect user
        return redirect('/')

    @app.route('/cards/position', methods=['PUT'])
    def cardsPositionRoute():
        author = authorise()
        if author:
            # UPDATE CARD POSITION
            if request.method == 'PUT':
                # Get form data
                json_data = request.get_json()

                # Validate input
                error = validateCard(
                    'updatePosition', stage=json_data['stage'], position=json_data['position'])
                if error:
                    # If not, print error message in the client
                    return error, 400

                # Update card
                card_id = author.update_card_position(
                    card_id=json_data['id'],
                    card_stage=json_data['stage'],
                    card_position=json_data['position']
                )
                if card_id:
                    return str(card_id)

                # If updating the card failed...
                return "Couldn't update card's position in the database", 500
        # If request is not authorised, redirect user
        return redirect('/')


''' AUTHENTICATION '''


def authorise():
    if 'id' in session:
        try:
            user_id = session.get("id")
            user = User.query.get(user_id)
            return user
        except Exception as e:
            print('Exception while authorising user card: ', e)
            return False
    return False


def register(name, password):
    # Validate input
    error = validateUserRegister(name, password)
    if error:
        # If not, print error message in the client
        return render_template('auth.html', route='register', error=error), 400

    # Hash password
    my_hash = bcrypt.hashpw(password.encode('UTF8'), bcrypt.gensalt(rounds=13))

    # Create user
    user = User(name=name, password=my_hash)
    try:
        # Add it to database
        db.session.add(user)
        db.session.commit()
    except Exception as e:
        print('Exception while creating user: ', e)
        # Server error
        return render_template('auth.html', route='register', error="Server error. Couldn't add user to the database."), 500

    # Create welcome cards
    # Card 1
    user.add_card(
        card_name='Welcome to orbit',
        card_content="This is a card. You can update each card's content by modifying this text-field. You can also create new cards by clicking in the spaceship icon in the navigation bar.",
        card_stage=0,
        card_position=0
    )

    # Card 2
    user.add_card(
        card_name='Drag me',
        card_content="That's right, you can drag cards around and drop them at any of the boards. If you're testing this on mobile the next board might be at the right edge of the screen. Drag the card over it to make the view snap to it.",
        card_stage=0,
        card_position=1
    )

    # Card 3
    user.add_card(
        card_name='Delete me',
        card_content="You might have notice already that the icons above get replaced by an asteroid while you're draggging things around. To delete a card, drop it in the navigation bar area and let the asteroid do its job.",
        card_stage=1,
        card_position=0
    )

    session['id'] = user.id
    return redirect('/kanban')


def login(name, password):
    # Make sure User exists already
    user = User.query.filter_by(name=name).first()

    if user != None:
        # Compare hashes to make sure password is correct
        my_hash = bcrypt.hashpw(password.encode('UTF8'), user.password.encode('UTF8'))
        if user.password == my_hash:
            session['id'] = user.id
            return redirect('/kanban')

    return render_template('auth.html', route='login', error='Invalid name or password'), 400


def logout():
    # Remove the username from the session if it's there
    session.pop('id', None)
    return redirect('/')


''' DATA VALIDATION '''


def validateUserRegister(name, password):
    # Make sure input is correct
    if name in [None, '']:
        return 'Name is required.'
    elif password in [None, '']:
        return 'Password is required.'
    elif len(name) > 10:
        return 'Name cannot exceed 10 characters.'
    elif len(name) < 2:
        return 'Name must be at least 2 characters long.'
    elif not name.isalnum():
        return "Name's characters must be alphanumeric."
    elif len(password) > 20:
        return 'Password cannot exceed 20 characters.'
    elif len(password) < 5:
        return 'Password must be at least 5 characters long.'

    # Make sure User doesn't exist already
    user = User.query.filter_by(name=name).first()

    if user == None:
        return False
    else:
        return 'Someone with the same name is already registered.'


def validateCard(validateAction, name='', content='', stage=0, position=0.0):
    if validateAction == 'newCard' or validateAction == 'updateContent':
        # Make sure name & content are valid
        if name in [None, '']:
            return "Name is required."
        elif content in [None, '']:
            return "Content is required."
        elif len(name) > 20:
            return "Name cannot exceed 20 characters."
        elif not all(substr.isspace() or substr.isalnum() for substr in name):
            return "Name's characters must be alphanumeric or spaces."
        elif len(content) > 250:
            return "Content cannot exceed 250 characters."

    if validateAction == 'newCard' or validateAction == 'updatePosition':
        if stage not in [0, 1, 2]:
            return "Stage must be either 0, 1 or 2."
        if not str(position).isdecimal:
            print(type(position))
            return "Position must be a number."

    return False

''' APP '''

main()

# Run Application
if __name__ == "__main__":
    app.run()