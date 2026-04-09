from flask import Flask, request, jsonify
from flask_cors import CORS
import math
import urllib.request
import urllib.parse
import json
import os

app = Flask(__name__)
CORS(app)

shipments_db = []

# ─────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────
OPENWEATHER_API_KEY = os.environ.get("OPENWEATHER_API_KEY", "YOUR_API_KEY_HERE")

# ─────────────────────────────────────────────
# CITY COORDINATES
# ─────────────────────────────────────────────
CITY_COORDS = {
    "Mumbai":    {"lat": 19.0760, "lng": 72.8777},
    "Delhi":     {"lat": 28.6139, "lng": 77.2090},
    "Chennai":   {"lat": 13.0827, "lng": 80.2707},
    "Bangalore": {"lat": 12.9716, "lng": 77.5946},
    "Kolkata":   {"lat": 22.5726, "lng": 88.3639},
    "Hyderabad": {"lat": 17.3850, "lng": 78.4867},
    "Pune":      {"lat": 18.5204, "lng": 73.8567},
    "Ahmedabad": {"lat": 23.0225, "lng": 72.5714},
    "Jaipur":    {"lat": 26.9124, "lng": 75.7873},
    "Lucknow":   {"lat": 26.8467, "lng": 80.9462},
    "Surat":     {"lat": 21.1702, "lng": 72.8311},
    "Nagpur":    {"lat": 21.1458, "lng": 79.0882},
    "Bhopal":    {"lat": 23.2599, "lng": 77.4126},
    "Indore":    {"lat": 22.7196, "lng": 75.8577},
    "Kochi":     {"lat": 9.9312,  "lng": 76.2673},
}

# ─────────────────────────────────────────────
# SUPPLIER DATABASE  (expanded)
# ─────────────────────────────────────────────
SUPPLIERS = {
    "sup-1": {
        "name": "PharmaLink Co.",
        "on_time_rate": 0.95,
        "price_score": 0.88,
        "quality_rate": 0.92,
        "delay_history": 1,
        "cold_chain": True,
        "years_active": 12,
        "coverage_cities": 14,
    },
    "sup-2": {
        "name": "MedSupply India",
        "on_time_rate": 0.78,
        "price_score": 0.91,
        "quality_rate": 0.85,
        "delay_history": 4,
        "cold_chain": False,
        "years_active": 7,
        "coverage_cities": 10,
    },
    "sup-3": {
        "name": "QuickMeds Ltd.",
        "on_time_rate": 0.88,
        "price_score": 0.76,
        "quality_rate": 0.89,
        "delay_history": 2,
        "cold_chain": True,
        "years_active": 9,
        "coverage_cities": 12,
    },
    "sup-4": {
        "name": "GlobalPharma",
        "on_time_rate": 0.60,
        "price_score": 0.95,
        "quality_rate": 0.72,
        "delay_history": 7,
        "cold_chain": False,
        "years_active": 4,
        "coverage_cities": 6,
    },
    "sup-5": {
        "name": "BioRoute Express",
        "on_time_rate": 0.91,
        "price_score": 0.82,
        "quality_rate": 0.94,
        "delay_history": 1,
        "cold_chain": True,
        "years_active": 6,
        "coverage_cities": 11,
    },
}

# ─────────────────────────────────────────────
# MEDICINE TEMPERATURE SENSITIVITY MAP
# ─────────────────────────────────────────────
COLD_CHAIN_MEDICINES = [
    "vaccine", "insulin", "biologics", "plasma", "blood",
    "antibody", "serum", "enzyme", "hormone", "immunoglobulin"
]

def needs_cold_chain(medicine_name: str) -> bool:
    name = medicine_name.lower()
    return any(keyword in name for keyword in COLD_CHAIN_MEDICINES)

# ─────────────────────────────────────────────
# HELPER: Haversine distance
# ─────────────────────────────────────────────
def haversine(city1, city2):
    if city1 not in CITY_COORDS or city2 not in CITY_COORDS:
        return 1000
    R = 6371
    lat1 = math.radians(CITY_COORDS[city1]["lat"])
    lon1 = math.radians(CITY_COORDS[city1]["lng"])
    lat2 = math.radians(CITY_COORDS[city2]["lat"])
    lon2 = math.radians(CITY_COORDS[city2]["lng"])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return R * 2 * math.asin(math.sqrt(a))

# ─────────────────────────────────────────────
# REAL WEATHER FETCH (OpenWeatherMap)
# ─────────────────────────────────────────────
WEATHER_FALLBACK_BY_REGION = {
    # Coastal / high-humidity cities — default Rainy
    "Mumbai": "Rainy", "Chennai": "Rainy", "Kochi": "Rainy", "Kolkata": "Rainy",
    # Inland / dry cities — default Clear
    "Delhi": "Clear", "Jaipur": "Clear", "Ahmedabad": "Clear",
    "Bhopal": "Clear", "Indore": "Clear", "Nagpur": "Clear",
    # Moderate cities — default Clear
    "Bangalore": "Clear", "Hyderabad": "Clear", "Pune": "Clear",
    "Lucknow": "Clear", "Surat": "Clear",
}

def map_openweather_to_category(weather_id: int, description: str) -> str:
    """
    Map OpenWeatherMap condition codes to MediFlow weather categories.
    https://openweathermap.org/weather-conditions
    """
    if weather_id >= 200 and weather_id < 300:
        return "Stormy"      # Thunderstorm group
    elif weather_id >= 300 and weather_id < 400:
        return "Rainy"       # Drizzle group
    elif weather_id >= 500 and weather_id < 600:
        if weather_id >= 502:
            return "Stormy"  # Heavy / very heavy rain
        return "Rainy"       # Light / moderate rain
    elif weather_id >= 600 and weather_id < 700:
        return "Fog"         # Snow maps to Fog (visibility risk)
    elif weather_id >= 700 and weather_id < 800:
        if weather_id in [711, 721, 741, 751, 761, 762]:
            return "Fog"     # Smoke, haze, fog, sand, dust
        return "Fog"
    elif weather_id == 800:
        return "Clear"
    elif weather_id >= 801 and weather_id <= 802:
        return "Clear"       # Few / scattered clouds still OK
    elif weather_id >= 803:
        return "Rainy"       # Broken / overcast clouds — treat as Rainy risk
    return "Clear"

def fetch_live_weather(city: str) -> dict:
    """
    Fetch real weather from OpenWeatherMap for a city.
    Returns dict with category, description, temperature, humidity, wind_speed.
    Falls back gracefully if API key missing or call fails.
    """
    coords = CITY_COORDS.get(city)
    if not coords:
        return {"category": "Clear", "description": "Unknown", "source": "fallback"}

    if OPENWEATHER_API_KEY == "YOUR_API_KEY_HERE" or not OPENWEATHER_API_KEY:
        # No key configured — use region-aware fallback
        category = WEATHER_FALLBACK_BY_REGION.get(city, "Clear")
        return {
            "category": category,
            "description": f"Regional estimate for {city}",
            "temperature_c": None,
            "humidity": None,
            "wind_speed_kmh": None,
            "source": "regional_fallback",
        }

    try:
        lat, lng = coords["lat"], coords["lng"]
        url = (
            f"https://api.openweathermap.org/data/2.5/weather"
            f"?lat={lat}&lon={lng}&appid={OPENWEATHER_API_KEY}&units=metric"
        )
        with urllib.request.urlopen(url, timeout=4) as resp:
            data = json.loads(resp.read().decode())

        weather_id  = data["weather"][0]["id"]
        description = data["weather"][0]["description"].title()
        temp_c      = round(data["main"]["temp"], 1)
        humidity    = data["main"]["humidity"]
        wind_kmh    = round(data["wind"]["speed"] * 3.6, 1)  # m/s to km/h

        # Override: very high wind always = Stormy
        if wind_kmh > 60:
            category = "Stormy"
        else:
            category = map_openweather_to_category(weather_id, description)

        return {
            "category": category,
            "description": description,
            "temperature_c": temp_c,
            "humidity": humidity,
            "wind_speed_kmh": wind_kmh,
            "source": "live_api",
        }

    except Exception:
        # API call failed — use region-aware fallback silently
        category = WEATHER_FALLBACK_BY_REGION.get(city, "Clear")
        return {
            "category": category,
            "description": f"Regional estimate for {city}",
            "temperature_c": None,
            "humidity": None,
            "wind_speed_kmh": None,
            "source": "regional_fallback",
        }

# ─────────────────────────────────────────────
# TRANSPORT MODE SELECTION  (smarter)
# ─────────────────────────────────────────────
def select_transport(priority: str, weight: float, distance_km: float, weather_category: str) -> str:
    """
    Smarter transport selection considering distance, weather, weight, and priority together.
    """
    if priority == "Emergency":
        # Emergency always flies regardless of weather
        return "Air"

    # Stormy / Fog grounds air for non-emergency
    air_blocked = weather_category in ["Stormy", "Fog"]

    if distance_km > 2000 and not air_blocked:
        return "Air"
    elif weight > 5000:
        return "Ship"
    elif weight > 1000 or distance_km > 800:
        return "Train"
    else:
        return "Truck"

# ─────────────────────────────────────────────
# AGENT 1: ETA PREDICTOR  (smarter)
# ─────────────────────────────────────────────
SPEED_MAP = {
    "Air":   750,   # km/h (commercial freight avg with loading)
    "Ship":   38,   # km/h
    "Train": 110,   # km/h
    "Truck":  65,   # km/h
}

WEATHER_PENALTY = {
    "Clear":  1.00,
    "Rainy":  1.18,
    "Stormy": 1.50,
    "Fog":    1.30,
}

LOADING_OVERHEAD_HOURS = {
    "Air":   4.0,   # airport check-in, cargo handling
    "Ship":  8.0,   # port processing
    "Train": 2.0,
    "Truck": 0.5,
}

def agent_eta(origin, destination, priority, transport_mode, weather_category, weight):
    distance_km = haversine(origin, destination)
    base_speed  = SPEED_MAP.get(transport_mode, 65)
    travel_hours = distance_km / base_speed

    # Weather penalty
    multiplier = WEATHER_PENALTY.get(weather_category, 1.0)

    # Weight loading penalty: +1h per extra 1000 kg over 500 kg threshold
    weight_penalty_hours = max(0, (weight - 500) / 1000) * 0.8

    # Overhead for mode
    overhead = LOADING_OVERHEAD_HOURS.get(transport_mode, 1.0)

    raw_hours = (travel_hours * multiplier) + overhead + weight_penalty_hours

    # Emergency priority: cuts non-travel time by 40%
    if priority == "Emergency":
        raw_hours = travel_hours * multiplier + (overhead * 0.6)

    final_hours = max(round(raw_hours, 1), 1.0)

    days  = int(final_hours // 24)
    hours = round(final_hours % 24, 1)
    if days > 0:
        display = f"{days}d {hours}h"
    else:
        display = f"{final_hours}h"

    return {
        "eta_hours":    final_hours,
        "eta_display":  display,
        "distance_km":  round(distance_km),
        "travel_hours": round(travel_hours, 1),
        "overhead_hours": round(overhead + weight_penalty_hours, 1),
    }

# ─────────────────────────────────────────────
# AGENT 2: DELAY RISK MONITOR  (smarter, more factors)
# ─────────────────────────────────────────────
def agent_risk(priority, supplier_id, weather_category, distance_km, weight, medicine, wind_speed_kmh=None):
    supplier = SUPPLIERS.get(supplier_id, {})
    delay_history  = supplier.get("delay_history", 3)
    on_time_rate   = supplier.get("on_time_rate", 0.80)
    cold_chain_cap = supplier.get("cold_chain", False)

    # --- Factor 1: Supplier reliability (0–1, high = risky)
    supplier_factor = 1.0 - on_time_rate
    # Penalise heavily if delay history is severe
    if delay_history >= 6:
        supplier_factor = min(supplier_factor + 0.20, 1.0)
    elif delay_history >= 4:
        supplier_factor = min(supplier_factor + 0.10, 1.0)

    # --- Factor 2: Distance (0–1)
    distance_factor = min(distance_km / 3000, 1.0)

    # --- Factor 3: Weather (0–1)
    weather_factor_map = {
        "Clear":  0.00,
        "Rainy":  0.30,
        "Stormy": 0.85,
        "Fog":    0.55,
    }
    weather_factor = weather_factor_map.get(weather_category, 0.20)

    # Boost weather factor if wind is very high
    if wind_speed_kmh and wind_speed_kmh > 50:
        weather_factor = min(weather_factor + 0.15, 1.0)

    # --- Factor 4: Cold-chain mismatch (binary penalty)
    cold_chain_penalty = 0.0
    if needs_cold_chain(medicine) and not cold_chain_cap:
        cold_chain_penalty = 0.25   # significant risk — medicine may degrade

    # --- Factor 5: Weight-to-mode strain
    weight_factor = min(weight / 8000, 0.20)  # caps at 0.20

    # --- Weighted composite score
    score = (
        0.35 * supplier_factor +
        0.25 * distance_factor +
        0.25 * weather_factor  +
        0.10 * weight_factor   +
        0.05 * (1 if cold_chain_penalty > 0 else 0)
    ) + cold_chain_penalty

    score = min(round(score, 3), 1.0)

    # Emergency floor: always at least Medium
    if priority == "Emergency" and score < 0.40:
        score = 0.40

    # Determine level and reason
    reasons = []

    if score > 0.65:
        level = "High"
    elif score > 0.38:
        level = "Medium"
    else:
        level = "Low"

    if supplier_factor > 0.25:
        reasons.append(f"supplier has {delay_history} recent delay(s)")
    if weather_factor >= 0.55:
        reasons.append(f"{weather_category.lower()} weather conditions")
    elif weather_factor >= 0.30:
        reasons.append(f"moderate {weather_category.lower()} weather")
    if cold_chain_penalty > 0:
        reasons.append("cold-chain medicine with non-refrigerated supplier")
    if distance_km > 1500:
        reasons.append(f"long haul route ({round(distance_km)} km)")
    if not reasons:
        reasons.append("reliable supplier with clear conditions and short route")

    reason_str = "; ".join(reasons).capitalize()

    return {
        "risk_level":  level,
        "risk_score":  score,
        "risk_reason": reason_str,
        "cold_chain_warning": cold_chain_penalty > 0,
        "factors": {
            "supplier":   round(supplier_factor, 3),
            "distance":   round(distance_factor, 3),
            "weather":    round(weather_factor, 3),
            "weight":     round(weight_factor, 3),
            "cold_chain": round(cold_chain_penalty, 3),
        },
    }

# ─────────────────────────────────────────────
# AGENT 3: ROUTE ADVISOR  (smarter)
# ─────────────────────────────────────────────
def agent_route(origin, destination, priority, weather_category, distance_km, transport_mode):
    has_severe_weather = weather_category in ["Stormy", "Fog"]

    # Cost per km varies by mode
    cost_rate = {"Air": 8.5, "Ship": 1.2, "Train": 2.0, "Truck": 3.5}
    base_rate = cost_rate.get(transport_mode, 3.5)

    cost_fastest  = round(distance_km * base_rate * 1.35)
    cost_cheapest = round(distance_km * base_rate * 0.72)
    cost_balanced = round(distance_km * base_rate * 1.00)

    speed = SPEED_MAP.get(transport_mode, 65)
    time_fastest  = round(distance_km / speed * 0.88, 1)   # express path
    time_cheapest = round(distance_km / speed * 1.30, 1)   # slower road routing
    time_balanced = round(distance_km / speed * 1.05, 1)   # slight buffer

    # Weather adjustments
    if has_severe_weather:
        weather_mult = WEATHER_PENALTY.get(weather_category, 1.0)
        time_fastest  = round(time_fastest  * weather_mult, 1)
        time_cheapest = round(time_cheapest * weather_mult, 1)
        time_balanced = round(time_balanced * weather_mult, 1)

    def time_saved_vs_cheapest(t):
        return round(time_cheapest - t, 1)

    routes = [
        {
            "type": "Fastest",
            "label": "Route A — Fastest",
            "time_hours": time_fastest,
            "cost_inr": cost_fastest,
            "risk": "Medium" if has_severe_weather else "Low",
            "description": "Priority express corridor — dedicated freight lanes",
            "time_saved_vs_cheapest": time_saved_vs_cheapest(time_fastest),
            "recommended": False,
        },
        {
            "type": "Cheapest",
            "label": "Route B — Cheapest",
            "time_hours": time_cheapest,
            "cost_inr": cost_cheapest,
            "risk": "High" if has_severe_weather else "Low",
            "description": "State road network — cost optimised, slower",
            "time_saved_vs_cheapest": 0.0,
            "recommended": False,
        },
        {
            "type": "Balanced",
            "label": "Route C — Balanced",
            "time_hours": time_balanced,
            "cost_inr": cost_balanced,
            "risk": "Medium" if has_severe_weather else "Low",
            "description": "Optimal blend of speed and cost efficiency",
            "time_saved_vs_cheapest": time_saved_vs_cheapest(time_balanced),
            "recommended": False,
        },
    ]

    # Recommendation logic
    if priority == "Emergency":
        rec_type = "Fastest"
    elif has_severe_weather:
        rec_type = "Balanced"    # Cheapest is too risky in bad weather
    elif priority == "High":
        rec_type = "Balanced"
    else:
        rec_type = "Cheapest"

    for r in routes:
        r["recommended"] = (r["type"] == rec_type)

    recommended = next(r for r in routes if r["recommended"])

    return {
        "routes":                  routes,
        "recommended_route":       recommended["label"],
        "recommended_description": recommended["description"],
        "avoiding_storms":         has_severe_weather,
        "recommendation_reason":   (
            "Emergency: fastest route always selected" if priority == "Emergency"
            else f"{weather_category} weather: avoiding cheapest route" if has_severe_weather and priority != "Emergency"
            else "Balanced route optimal for current conditions"
        ),
    }

# ─────────────────────────────────────────────
# AGENT 4: SUPPLIER SCORER  (smarter formula + cold-chain awareness)
# ─────────────────────────────────────────────
def agent_supplier_score(supplier_id, medicine=""):
    cold_chain_needed = needs_cold_chain(medicine)
    ranked = []

    for sid, sup in SUPPLIERS.items():
        # Base composite score
        base_score = (
            0.40 * sup["on_time_rate"] +
            0.30 * sup["price_score"]  +
            0.30 * sup["quality_rate"]
        )

        # Experience bonus: up to +3% for long-established suppliers
        experience_bonus = min(sup["years_active"] / 100, 0.03)

        # Coverage bonus: wider network = more reliable
        coverage_bonus = min(sup["coverage_cities"] / 200, 0.02)

        # Cold chain: penalise if medicine needs it but supplier lacks it
        cold_chain_penalty = 0.10 if (cold_chain_needed and not sup["cold_chain"]) else 0.0

        final_score = base_score + experience_bonus + coverage_bonus - cold_chain_penalty
        final_score = max(min(final_score, 1.0), 0.0)

        ranked.append({
            "id":              sid,
            "name":            sup["name"],
            "on_time_rate":    round(sup["on_time_rate"] * 100, 1),
            "price_score":     round(sup["price_score"]  * 100, 1),
            "quality_rate":    round(sup["quality_rate"] * 100, 1),
            "total_score":     round(final_score * 100, 1),
            "delay_history":   sup["delay_history"],
            "cold_chain":      sup["cold_chain"],
            "years_active":    sup["years_active"],
            "coverage_cities": sup["coverage_cities"],
            "is_current":      sid == supplier_id,
            "cold_chain_warning": cold_chain_needed and not sup["cold_chain"],
        })

    ranked.sort(key=lambda x: x["total_score"], reverse=True)

    for i, s in enumerate(ranked):
        s["rank"] = i + 1

    current = next((s for s in ranked if s["is_current"]), None)
    backup  = next((s for s in ranked if not s["is_current"]), None)

    # Only suggest backup if current is not top-ranked
    suggest_backup = current and current["rank"] > 1

    return {
        "rankings":        ranked,
        "current_supplier": current,
        "backup_supplier": backup if suggest_backup else None,
    }

# ─────────────────────────────────────────────
# MAIN ENDPOINT: All 4 Agents in one call
# ─────────────────────────────────────────────
@app.route("/api/analyze-shipment", methods=["POST"])
def analyze_shipment():
    data        = request.json
    priority    = data.get("priority", "Normal")
    weight      = float(data.get("weight", 100))
    origin      = data.get("origin", "Mumbai")
    destination = data.get("destination", "Delhi")
    supplier_id = data.get("supplierId", "sup-1")
    medicine    = data.get("medicine", "")

    # --- Live weather fetch for origin city
    weather_data     = fetch_live_weather(origin)
    weather_category = weather_data["category"]
    wind_speed_kmh   = weather_data.get("wind_speed_kmh")

    # --- Transport selection (weather-aware)
    transport   = select_transport(priority, weight, haversine(origin, destination), weather_category)
    distance_km = haversine(origin, destination)

    # --- Run all 4 agents
    eta_result      = agent_eta(origin, destination, priority, transport, weather_category, weight)
    risk_result     = agent_risk(priority, supplier_id, weather_category, distance_km, weight, medicine, wind_speed_kmh)
    route_result    = agent_route(origin, destination, priority, weather_category, distance_km, transport)
    supplier_result = agent_supplier_score(supplier_id, medicine)

    # --- HIGH RISK auto-response actions
    auto_actions = []
    if risk_result["risk_level"] == "High":
        auto_actions.append(f"Alert: {risk_result['risk_reason']}")
        if supplier_result["backup_supplier"]:
            backup = supplier_result["backup_supplier"]
            auto_actions.append(
                f"Backup supplier activated: {backup['name']} (Score: {backup['total_score']}%)"
            )
        time_saving = round(eta_result["eta_hours"] * 0.22, 1)
        auto_actions.append(f"Switched to fastest route — estimated saving: {time_saving}h")
        auto_actions.append(f"Hospital notified with updated ETA: {eta_result['eta_display']}")

    if risk_result["cold_chain_warning"]:
        auto_actions.append(
            "Cold-chain alert: medicine requires refrigerated transport — switching to cold-chain supplier recommended"
        )

    origin_coords = CITY_COORDS.get(origin, {"lat": 20, "lng": 77})
    dest_coords   = CITY_COORDS.get(destination, {"lat": 28, "lng": 77})

    return jsonify({
        # Agent 1
        "eta":             eta_result["eta_display"],
        "eta_hours":       eta_result["eta_hours"],
        "distance_km":     eta_result["distance_km"],
        "travel_hours":    eta_result["travel_hours"],
        "overhead_hours":  eta_result["overhead_hours"],

        # Agent 2
        "prediction":          risk_result["risk_level"],
        "risk_score":          risk_result["risk_score"],
        "risk_reason":         risk_result["risk_reason"],
        "risk_factors":        risk_result["factors"],
        "cold_chain_warning":  risk_result["cold_chain_warning"],

        # Agent 3
        "route":                   route_result["recommended_route"],
        "route_description":       route_result["recommended_description"],
        "route_recommendation_reason": route_result["recommendation_reason"],
        "all_routes":              route_result["routes"],
        "roadblocks":              route_result["avoiding_storms"],

        # Agent 4
        "supplier_rankings":  supplier_result["rankings"],
        "current_supplier":   supplier_result["current_supplier"],
        "backup_supplier":    supplier_result["backup_supplier"],

        # Transport & weather
        "transportMode": transport,
        "weather":        weather_category,
        "weather_detail": weather_data,

        # Crisis response
        "auto_actions": auto_actions,
        "is_crisis":    len(auto_actions) > 0,

        # Map data
        "origin_coords": origin_coords,
        "dest_coords":   dest_coords,
    })


# ─────────────────────────────────────────────
# SAVE + GET SHIPMENTS
# ─────────────────────────────────────────────
@app.route("/create-shipment", methods=["POST"])
def create_shipment():
    shipments_db.append(request.json)
    return jsonify({"message": "saved", "total": len(shipments_db)})

@app.route("/shipments", methods=["GET"])
def get_shipments():
    return jsonify(shipments_db)

@app.route("/suppliers", methods=["GET"])
def get_suppliers():
    ranked = []
    for sid, sup in SUPPLIERS.items():
        score = (
            0.40 * sup["on_time_rate"] +
            0.30 * sup["price_score"]  +
            0.30 * sup["quality_rate"]
        )
        ranked.append({
            "id":         sid,
            "name":       sup["name"],
            "totalScore": round(score * 100, 1),
            "cold_chain": sup["cold_chain"],
        })
    ranked.sort(key=lambda x: x["totalScore"], reverse=True)
    return jsonify(ranked)

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status":    "MediFlow AI running",
        "agents":    4,
        "shipments": len(shipments_db),
        "weather":   "live_api" if OPENWEATHER_API_KEY != "YOUR_API_KEY_HERE" else "regional_fallback",
    })


if __name__ == "__main__":
    app.run(debug=True, port=5000)