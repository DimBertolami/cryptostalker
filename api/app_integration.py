"""
Main Flask Application Integration

This module integrates the prediction and trading modules with the main Flask application.
"""

from flask import Flask
from api.prediction.api_integration import register_routes as register_prediction_routes

def create_app():
    """Create and configure the Flask application."""
    app = Flask(__name__)
    
    # Register prediction API routes
    register_prediction_routes(app)
    
    # Add more route registrations here as needed
    
    @app.route('/api/health')
    def health_check():
        """Health check endpoint."""
        return {'status': 'ok', 'message': 'Prediction and trading modules integrated'}
    
    return app

# Create the Flask application
app = create_app()

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
