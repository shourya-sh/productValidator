from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # <-- Enables CORS for all domains and routes

@app.route("/receive-data", methods=["POST"])
def receive_data():
    data = request.get_json()
    print("Received:", data)
    return jsonify({"status": "success"})

if __name__ == "__main__":
    app.run(debug=True)