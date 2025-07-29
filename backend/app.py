from flask import Flask, jsonify, request, render_template, redirect, url_for, session
from flask_cors import CORS
from models import db, Player
import os
from dotenv import load_dotenv
from functools import wraps

load_dotenv()

app = Flask(
    __name__,
    static_folder='../frontend/static',
    template_folder='../frontend/templates'
)
app.secret_key = os.urandom(24)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///toepen.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
CORS(app)

db.init_app(app)
with app.app_context():
    db.create_all()

ADMIN_PW = os.getenv('ADMIN_PW')
NORMAL_PW = os.getenv('NORMAL_PW')

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get('logged_in'):
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated

def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if session.get('role') != 'admin':
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated

@app.route('/login', methods=['GET', 'POST'])
def login():
    error = None
    if request.method == 'POST':
        pw = request.form.get('password', '')
        if pw == ADMIN_PW:
            session['logged_in'] = True
            session['role'] = 'admin'
            return redirect(url_for('admin'))
        if pw == NORMAL_PW:
            session['logged_in'] = True
            session['role'] = 'user'
            return redirect(url_for('index'))
        error = 'Invalid password'
    return render_template('login.html', error=error)

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

@app.route('/')
@login_required
def index():
    return render_template('index.html')

@app.route('/admin')
@admin_required
def admin():
    return render_template('admin.html')

# API: list all players
@app.route('/players', methods=['GET'])
@login_required
def list_players():
    players = Player.query.order_by(Player.name).all()
    return jsonify([{
        'id':      p.id,
        'name':    p.name,
        'wins':    p.wins,
        'losses':  p.losses
    } for p in players])

# API: create or get a player
@app.route('/players', methods=['POST'])
@login_required
def create_or_get_player():
    data = request.json or {}
    raw = data.get('name','').strip()
    if not raw:
        return jsonify({'error':'Name required'}), 400
    name = raw[0].upper() + raw[1:].lower() if len(raw) > 1 else raw.upper()
    p = Player.query.filter_by(name=name).first()
    if not p:
        p = Player(name=name)
        db.session.add(p)
        db.session.commit()
        return jsonify({
            'id':      p.id,
            'name':    p.name,
            'wins':    p.wins,
            'losses':  p.losses
        }), 201
    return jsonify({
        'id':      p.id,
        'name':    p.name,
        'wins':    p.wins,
        'losses':  p.losses
    }), 200

# API: update wins/losses
@app.route('/players/<int:id>/record', methods=['POST'])
@login_required
def update_record(id):
    data = request.json or {}
    win_delta   = data.get('win_delta', 0)
    loss_delta  = data.get('loss_delta', 0)
    p = Player.query.get_or_404(id)
    p.wins    += win_delta
    p.losses  += loss_delta
    db.session.commit()
    return jsonify({
        'id':      p.id,
        'name':    p.name,
        'wins':    p.wins,
        'losses':  p.losses
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
