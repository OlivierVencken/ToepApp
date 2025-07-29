from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class Player(db.Model):
    id      = db.Column(db.Integer, primary_key=True)
    name    = db.Column(db.String(50), unique=True, nullable=False)
    wins    = db.Column(db.Integer, default=0, nullable=False)
    losses  = db.Column(db.Integer, default=0, nullable=False)
