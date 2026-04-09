from flask import Flask, request, jsonify
import random

app = Flask(__name__)

@app.route('/api/shipment', methods=['POST'])
def create_shipment():
    eta = f"{random.randint(1,3)} days {random.randint(1,10)} hours"
    confidence = f"{random.randint(85,95)}%"
    risk = random.choice(["HIGH", "MEDIUM", "LOW"])

    routes = [
        {"type":"Fastest","time":"1.5 days","cost":4200},
        {"type":"Balanced","time":"2 days","cost":3000},
        {"type":"Cheapest","time":"3 days","cost":2100}
    ]

    supplier = {"name":"PharmaLink","score":91.7}

    alert = None
    if risk == "HIGH":
        alert = {
            "message": "HIGH RISK detected — switching supplier & route",
            "action": "Using PharmaLink + Fastest Route"
        }

    return jsonify({
        "eta": eta,
        "confidence": confidence,
        "risk": risk,
        "routes": routes,
        "supplier": supplier,
        "alert": alert
    })

if __name__ == '__main__':
    app.run(debug=True)