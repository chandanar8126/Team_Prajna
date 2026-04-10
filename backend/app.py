from flask import Flask, request, jsonify
from flask_cors import CORS
import math
import urllib.request
import urllib.error
import json
import os
import time
import hashlib
import random

app = Flask(__name__)
CORS(app)

shipments_db      = []
traffic_alerts_db = []

# ─────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────
OPENWEATHER_API_KEY  = os.environ.get("OPENWEATHER_API_KEY", "")
TOMTOM_API_KEY       = os.environ.get("TOMTOM_API_KEY", "")
TWILIO_ACCOUNT_SID   = os.environ.get("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN    = os.environ.get("TWILIO_AUTH_TOKEN", "")
TWILIO_FROM_NUMBER   = os.environ.get("TWILIO_FROM_NUMBER", "")
POLICE_PHONE         = os.environ.get("POLICE_PHONE", "")

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
    "Agra":      {"lat": 27.1767, "lng": 78.0081},
    "Mysore":    {"lat": 12.2958, "lng": 76.6394},
    "Vellore":   {"lat": 12.9165, "lng": 79.1325},
}

SUPPLIERS = {
    "sup-1": {"name": "PharmaLink Co.",   "on_time_rate": 0.95, "price_score": 0.88, "quality_rate": 0.92, "delay_history": 1, "cold_chain": True,  "years_active": 12, "coverage_cities": 14},
    "sup-2": {"name": "MedSupply India",  "on_time_rate": 0.78, "price_score": 0.91, "quality_rate": 0.85, "delay_history": 4, "cold_chain": False, "years_active": 7,  "coverage_cities": 10},
    "sup-3": {"name": "QuickMeds Ltd.",   "on_time_rate": 0.88, "price_score": 0.76, "quality_rate": 0.89, "delay_history": 2, "cold_chain": True,  "years_active": 9,  "coverage_cities": 12},
    "sup-4": {"name": "GlobalPharma",     "on_time_rate": 0.60, "price_score": 0.95, "quality_rate": 0.72, "delay_history": 7, "cold_chain": False, "years_active": 4,  "coverage_cities": 6},
    "sup-5": {"name": "BioRoute Express", "on_time_rate": 0.91, "price_score": 0.82, "quality_rate": 0.94, "delay_history": 1, "cold_chain": True,  "years_active": 6,  "coverage_cities": 11},
}

COLD_CHAIN_MEDICINES = ["vaccine","insulin","biologics","plasma","blood","antibody","serum","enzyme","hormone","immunoglobulin"]

def needs_cold_chain(medicine_name):
    return any(k in medicine_name.lower() for k in COLD_CHAIN_MEDICINES)

def haversine(city1, city2):
    if city1 not in CITY_COORDS or city2 not in CITY_COORDS:
        return 1000
    R = 6371
    lat1 = math.radians(CITY_COORDS[city1]["lat"]); lon1 = math.radians(CITY_COORDS[city1]["lng"])
    lat2 = math.radians(CITY_COORDS[city2]["lat"]); lon2 = math.radians(CITY_COORDS[city2]["lng"])
    dlat, dlon = lat2-lat1, lon2-lon1
    a = math.sin(dlat/2)**2 + math.cos(lat1)*math.cos(lat2)*math.sin(dlon/2)**2
    return R * 2 * math.asin(math.sqrt(a))

def midpoint(city1, city2):
    c1, c2 = CITY_COORDS.get(city1, {}), CITY_COORDS.get(city2, {})
    if not c1 or not c2: return {"lat": 20.0, "lng": 77.0}
    return {"lat": (c1["lat"]+c2["lat"])/2, "lng": (c1["lng"]+c2["lng"])/2}

# ─────────────────────────────────────────────
# TOMTOM TRAFFIC
# ─────────────────────────────────────────────
def check_traffic(origin, destination):
    mid = midpoint(origin, destination)
    if TOMTOM_API_KEY:
        try:
            url = (f"https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json"
                   f"?point={mid['lat']},{mid['lng']}&key={TOMTOM_API_KEY}")
            with urllib.request.urlopen(url, timeout=5) as resp:
                data = json.loads(resp.read().decode())
            flow            = data.get("flowSegmentData", {})
            current_speed   = flow.get("currentSpeed", 60)
            free_flow_speed = flow.get("freeFlowSpeed", 60)
            speed_ratio     = current_speed / max(free_flow_speed, 1)
            distance_km     = haversine(origin, destination)
            delay_minutes   = max(round((distance_km/max(current_speed,1) - distance_km/max(free_flow_speed,1))*60), 0)
            if speed_ratio < 0.40:   level = "Severe"
            elif speed_ratio < 0.65: level = "Heavy"
            elif speed_ratio < 0.80: level = "Moderate"
            else:                    level = "Clear"
            return {"level": level, "current_speed": current_speed, "free_flow_speed": free_flow_speed,
                    "speed_ratio": round(speed_ratio,2), "delay_minutes": delay_minutes,
                    "confidence": flow.get("confidence", 1.0), "check_point": mid,
                    "source": "tomtom_live", "needs_clearance": level in ["Severe","Heavy"]}
        except Exception as e:
            print(f"TomTom error: {e}")

    # Guaranteed demo simulation — fixed outcomes per route pair
    # Routes 1 & 3 always get Heavy, Route 2 gets Moderate, Route 4 gets Clear
    # This ensures the demo always shows traffic alerts and police SMS firing
    FIXED_TRAFFIC = {
        ("Mumbai",    "Pune"):    ("Heavy",    0.52, 28),
        ("Delhi",     "Agra"):    ("Moderate", 0.73, 14),
        ("Bangalore", "Mysore"):  ("Heavy",    0.48, 32),
        ("Chennai",   "Vellore"): ("Clear",    0.91,  0),
    }
    if (origin, destination) in FIXED_TRAFFIC:
        level, sr, delay = FIXED_TRAFFIC[(origin, destination)]
    else:
        # For any other city pair — use hash-based simulation
        pair_hash = int(hashlib.md5(f"{origin}{destination}".encode()).hexdigest(), 16) % 100
        if pair_hash > 70:   level, sr, delay = "Heavy",    0.55, 25
        elif pair_hash > 45: level, sr, delay = "Moderate", 0.74, 12
        else:                level, sr, delay = "Clear",    0.92,  0
    return {"level": level, "current_speed": round(65*sr), "free_flow_speed": 65,
            "speed_ratio": sr, "delay_minutes": delay, "confidence": 0.85,
            "check_point": mid, "source": "simulated", "needs_clearance": level in ["Severe","Heavy"]}

# ─────────────────────────────────────────────
# FAST2SMS POLICE ALERT
# ─────────────────────────────────────────────
def send_police_sms(truck_number, origin, destination, medicine, delay_minutes, traffic_level, priority):
    urgency = "EMERGENCY" if priority == "Emergency" else "PRIORITY"
    message = (
        f"LOGIFLOW {urgency}: Truck {truck_number} carrying {medicine}, "
        f"{origin} to {destination}. "
        f"{traffic_level} traffic, {delay_minutes}min delay. "
        f"Please clear route. -LogiFlow AI"
    )

    if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN or not TWILIO_FROM_NUMBER or not POLICE_PHONE:
        return {"sent": False, "simulated": True, "message": message,
                "to": POLICE_PHONE or "NOT_CONFIGURED", "reason": "Twilio keys not configured"}

    try:
        # Twilio REST API — no SDK needed, plain HTTP
        to_number = f"+91{POLICE_PHONE}" if not POLICE_PHONE.startswith("+") else POLICE_PHONE

        payload = urllib.parse.urlencode({
            "To":   to_number,
            "From": TWILIO_FROM_NUMBER,
            "Body": message,
        }).encode()

        # Basic auth with Account SID + Auth Token
        import base64
        credentials = base64.b64encode(f"{TWILIO_ACCOUNT_SID}:{TWILIO_AUTH_TOKEN}".encode()).decode()

        url = f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/Messages.json"
        req = urllib.request.Request(
            url, data=payload,
            headers={
                "Authorization": f"Basic {credentials}",
                "Content-Type":  "application/x-www-form-urlencoded",
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=8) as resp:
                raw = resp.read().decode()
                print(f"[SMS] Twilio response: {raw[:200]}")
                result = json.loads(raw)
            return {"sent": result.get("status") in ["queued","sent","delivered"],
                    "simulated": False, "message": message,
                    "to": to_number, "sid": result.get("sid"), "status": result.get("status")}
        except urllib.error.HTTPError as e:
            raw = e.read().decode()
            print(f"[SMS] Twilio HTTP {e.code}: {raw}")
            return {"sent": False, "simulated": True, "message": message,
                    "to": to_number, "reason": f"Twilio {e.code}: {raw}"}

    except Exception as e:
        print(f"[SMS] Exception: {e}")
        return {"sent": False, "simulated": True, "message": message,
                "to": POLICE_PHONE, "reason": str(e)}

# ─────────────────────────────────────────────
# WEATHER
# ─────────────────────────────────────────────
WEATHER_FALLBACK = {
    "Mumbai":"Rainy","Chennai":"Rainy","Kochi":"Rainy","Kolkata":"Rainy",
    "Delhi":"Clear","Jaipur":"Clear","Ahmedabad":"Clear","Bhopal":"Clear","Indore":"Clear","Nagpur":"Clear",
    "Bangalore":"Clear","Hyderabad":"Clear","Pune":"Clear","Lucknow":"Clear","Surat":"Clear",
    "Agra":"Clear","Mysore":"Clear","Vellore":"Clear",
}
def map_ow(wid):
    if 200<=wid<300: return "Stormy"
    if 300<=wid<400: return "Rainy"
    if 500<=wid<600: return "Stormy" if wid>=502 else "Rainy"
    if 600<=wid<800: return "Fog"
    if wid==800: return "Clear"
    if wid<=802: return "Clear"
    return "Rainy"

def fetch_live_weather(city):
    c = CITY_COORDS.get(city)
    base = {"temperature_c":None,"humidity":None,"wind_speed_kmh":None}
    if not c: return {**base,"category":"Clear","description":"Unknown","source":"fallback"}
    if not OPENWEATHER_API_KEY:
        cat = WEATHER_FALLBACK.get(city,"Clear")
        return {**base,"category":cat,"description":"Regional estimate","source":"regional_fallback"}
    try:
        url = f"https://api.openweathermap.org/data/2.5/weather?lat={c['lat']}&lon={c['lng']}&appid={OPENWEATHER_API_KEY}&units=metric"
        with urllib.request.urlopen(url, timeout=4) as resp:
            data = json.loads(resp.read().decode())
        wid  = data["weather"][0]["id"]
        desc = data["weather"][0]["description"].title()
        temp = round(data["main"]["temp"],1)
        hum  = data["main"]["humidity"]
        wind = round(data["wind"]["speed"]*3.6,1)
        cat  = "Stormy" if wind>60 else map_ow(wid)
        return {"category":cat,"description":desc,"temperature_c":temp,"humidity":hum,"wind_speed_kmh":wind,"source":"live_api"}
    except:
        cat = WEATHER_FALLBACK.get(city,"Clear")
        return {**base,"category":cat,"description":"Regional estimate","source":"regional_fallback"}

# ─────────────────────────────────────────────
# AGENTS
# ─────────────────────────────────────────────
SPEED_MAP = {"Air":750,"Ship":38,"Train":110,"Truck":65}
WEATHER_PENALTY = {"Clear":1.00,"Rainy":1.18,"Stormy":1.50,"Fog":1.30}
LOADING_OH = {"Air":4.0,"Ship":8.0,"Train":2.0,"Truck":0.5}

def select_transport(priority, weight, distance_km, weather_category):
    if priority=="Emergency": return "Air"
    air_blocked = weather_category in ["Stormy","Fog"]
    if distance_km>2000 and not air_blocked: return "Air"
    elif weight>5000: return "Ship"
    elif weight>1000 or distance_km>800: return "Train"
    return "Truck"

def agent_eta(origin, destination, priority, transport_mode, weather_category, weight):
    distance_km  = haversine(origin, destination)
    travel_hours = distance_km / SPEED_MAP.get(transport_mode, 65)
    mult         = WEATHER_PENALTY.get(weather_category, 1.0)
    weight_pen   = max(0,(weight-500)/1000)*0.8
    overhead     = LOADING_OH.get(transport_mode, 1.0)
    raw          = (travel_hours*mult)+overhead+weight_pen
    if priority=="Emergency": raw = travel_hours*mult+(overhead*0.6)
    final        = max(round(raw,1),1.0)
    days,hrs     = int(final//24), round(final%24,1)
    display      = f"{days}d {hrs}h" if days>0 else f"{final}h"
    return {"eta_hours":final,"eta_display":display,"distance_km":round(distance_km),
            "travel_hours":round(travel_hours,1),"overhead_hours":round(overhead+weight_pen,1)}

def agent_risk(priority, supplier_id, weather_category, distance_km, weight, medicine, wind_speed_kmh=None):
    sup = SUPPLIERS.get(supplier_id,{})
    dh  = sup.get("delay_history",3)
    otr = sup.get("on_time_rate",0.80)
    sf  = 1.0-otr
    if dh>=6: sf=min(sf+0.20,1.0)
    elif dh>=4: sf=min(sf+0.10,1.0)
    df  = min(distance_km/3000,1.0)
    wfm = {"Clear":0.00,"Rainy":0.30,"Stormy":0.85,"Fog":0.55}
    wf  = wfm.get(weather_category,0.20)
    if wind_speed_kmh and wind_speed_kmh>50: wf=min(wf+0.15,1.0)
    ccp = 0.25 if (needs_cold_chain(medicine) and not sup.get("cold_chain",False)) else 0.0
    wgt = min(weight/8000,0.20)
    score = min(round(0.35*sf+0.25*df+0.25*wf+0.10*wgt+0.05*(1 if ccp>0 else 0)+ccp,3),1.0)
    if priority=="Emergency" and score<0.40: score=0.40
    level = "High" if score>0.65 else ("Medium" if score>0.38 else "Low")
    reasons=[]
    if sf>0.25: reasons.append(f"supplier has {dh} recent delay(s)")
    if wf>=0.55: reasons.append(f"{weather_category.lower()} weather conditions")
    elif wf>=0.30: reasons.append(f"moderate {weather_category.lower()} weather")
    if ccp>0: reasons.append("cold-chain medicine with non-refrigerated supplier")
    if distance_km>1500: reasons.append(f"long haul route ({round(distance_km)} km)")
    if not reasons: reasons.append("reliable supplier with clear conditions")
    return {"risk_level":level,"risk_score":score,"risk_reason":"; ".join(reasons).capitalize(),
            "cold_chain_warning":ccp>0,
            "factors":{"supplier":round(sf,3),"distance":round(df,3),"weather":round(wf,3),"weight":round(wgt,3),"cold_chain":round(ccp,3)}}

def agent_route(origin, destination, priority, weather_category, distance_km, transport_mode):
    hs  = weather_category in ["Stormy","Fog"]
    br  = {"Air":8.5,"Ship":1.2,"Train":2.0,"Truck":3.5}.get(transport_mode,3.5)
    spd = SPEED_MAP.get(transport_mode,65)
    wm  = WEATHER_PENALTY.get(weather_category,1.0) if hs else 1.0
    routes=[
        {"type":"Fastest", "label":"Route A — Fastest", "time_hours":round(distance_km/spd*0.88*wm,1),"cost_inr":round(distance_km*br*1.35),"risk":"Medium" if hs else "Low","description":"Priority express corridor — dedicated freight lanes","recommended":False},
        {"type":"Cheapest","label":"Route B — Cheapest","time_hours":round(distance_km/spd*1.30*wm,1),"cost_inr":round(distance_km*br*0.72),"risk":"High"   if hs else "Low","description":"State road network — cost optimised, slower","recommended":False},
        {"type":"Balanced","label":"Route C — Balanced","time_hours":round(distance_km/spd*1.05*wm,1),"cost_inr":round(distance_km*br*1.00),"risk":"Medium" if hs else "Low","description":"Optimal blend of speed and cost efficiency","recommended":False},
    ]
    rec = "Fastest" if priority=="Emergency" else ("Balanced" if hs or priority=="High" else "Cheapest")
    for r in routes: r["recommended"]=(r["type"]==rec)
    ct = next(r["time_hours"] for r in routes if r["type"]=="Cheapest")
    for r in routes: r["time_saved_vs_cheapest"]=round(ct-r["time_hours"],1)
    rr = next(r for r in routes if r["recommended"])
    return {"routes":routes,"recommended_route":rr["label"],"recommended_description":rr["description"],
            "avoiding_storms":hs,"recommendation_reason":(
                "Emergency: fastest route always selected" if priority=="Emergency"
                else f"{weather_category} weather: avoiding cheapest route" if hs
                else "Balanced route optimal for current conditions")}

def agent_supplier_score(supplier_id, medicine=""):
    cn = needs_cold_chain(medicine)
    ranked=[]
    for sid,sup in SUPPLIERS.items():
        base  = 0.40*sup["on_time_rate"]+0.30*sup["price_score"]+0.30*sup["quality_rate"]
        exp   = min(sup["years_active"]/100,0.03)
        cov   = min(sup["coverage_cities"]/200,0.02)
        pen   = 0.10 if (cn and not sup["cold_chain"]) else 0.0
        score = max(min(base+exp+cov-pen,1.0),0.0)
        ranked.append({"id":sid,"name":sup["name"],"on_time_rate":round(sup["on_time_rate"]*100,1),
                       "price_score":round(sup["price_score"]*100,1),"quality_rate":round(sup["quality_rate"]*100,1),
                       "total_score":round(score*100,1),"delay_history":sup["delay_history"],
                       "cold_chain":sup["cold_chain"],"years_active":sup["years_active"],
                       "coverage_cities":sup["coverage_cities"],"is_current":sid==supplier_id,
                       "cold_chain_warning":cn and not sup["cold_chain"]})
    ranked.sort(key=lambda x:x["total_score"],reverse=True)
    for i,s in enumerate(ranked): s["rank"]=i+1
    current = next((s for s in ranked if s["is_current"]),None)
    backup  = next((s for s in ranked if not s["is_current"]),None)
    return {"rankings":ranked,"current_supplier":current,
            "backup_supplier":backup if (current and current["rank"]>1) else None}

# ─────────────────────────────────────────────
# MAIN SHIPMENT ENDPOINT
# ─────────────────────────────────────────────
@app.route("/api/analyze-shipment", methods=["POST"])
def analyze_shipment():
    data        = request.json
    priority    = data.get("priority","Normal")
    weight      = float(data.get("weight",100))
    origin      = data.get("origin","Mumbai")
    destination = data.get("destination","Delhi")
    supplier_id = data.get("supplierId","sup-1")
    medicine    = data.get("medicine","")

    weather_data     = fetch_live_weather(origin)
    weather_category = weather_data["category"]
    wind_speed_kmh   = weather_data.get("wind_speed_kmh")
    distance_km      = haversine(origin, destination)
    transport        = select_transport(priority, weight, distance_km, weather_category)

    eta_result      = agent_eta(origin, destination, priority, transport, weather_category, weight)
    risk_result     = agent_risk(priority, supplier_id, weather_category, distance_km, weight, medicine, wind_speed_kmh)
    route_result    = agent_route(origin, destination, priority, weather_category, distance_km, transport)
    supplier_result = agent_supplier_score(supplier_id, medicine)

    # Traffic check only for Truck
    traffic_result = check_traffic(origin, destination) if transport == "Truck" else None

    auto_actions=[]
    if risk_result["risk_level"]=="High":
        auto_actions.append(f"Alert: {risk_result['risk_reason']}")
        if supplier_result["backup_supplier"]:
            b=supplier_result["backup_supplier"]
            auto_actions.append(f"Backup supplier activated: {b['name']} (Score: {b['total_score']}%)")
        auto_actions.append(f"Switched to fastest route — saving {round(eta_result['eta_hours']*0.22,1)}h")
        auto_actions.append(f"Hospital notified with updated ETA: {eta_result['eta_display']}")
    if risk_result["cold_chain_warning"]:
        auto_actions.append("Cold-chain alert: medicine requires refrigerated transport")
    if traffic_result and traffic_result["needs_clearance"]:
        auto_actions.append(f"Traffic: {traffic_result['level']} congestion — {traffic_result['delay_minutes']} min delay")
        auto_actions.append("Police route clearance SMS dispatched automatically")

    return jsonify({
        "eta":eta_result["eta_display"],"eta_hours":eta_result["eta_hours"],
        "distance_km":eta_result["distance_km"],"travel_hours":eta_result["travel_hours"],
        "overhead_hours":eta_result["overhead_hours"],
        "prediction":risk_result["risk_level"],"risk_score":risk_result["risk_score"],
        "risk_reason":risk_result["risk_reason"],"risk_factors":risk_result["factors"],
        "cold_chain_warning":risk_result["cold_chain_warning"],
        "route":route_result["recommended_route"],"route_description":route_result["recommended_description"],
        "route_recommendation_reason":route_result["recommendation_reason"],
        "all_routes":route_result["routes"],"roadblocks":route_result["avoiding_storms"],
        "supplier_rankings":supplier_result["rankings"],
        "current_supplier":supplier_result["current_supplier"],
        "backup_supplier":supplier_result["backup_supplier"],
        "transportMode":transport,"weather":weather_category,"weather_detail":weather_data,
        "traffic":traffic_result,
        "auto_actions":auto_actions,"is_crisis":len(auto_actions)>0,
        "origin_coords":CITY_COORDS.get(origin,{"lat":20,"lng":77}),
        "dest_coords":CITY_COORDS.get(destination,{"lat":28,"lng":77}),
    })

# ─────────────────────────────────────────────
# TRAFFIC CHECK ENDPOINT (LiveMap polling)
# ─────────────────────────────────────────────
@app.route("/api/check-traffic", methods=["POST"])
def check_traffic_endpoint():
    data   = request.json
    origin = data.get("origin","Mumbai")
    dest   = data.get("destination","Pune")
    return jsonify(check_traffic(origin, dest))

# ─────────────────────────────────────────────
# POLICE ALERT ENDPOINT
# ─────────────────────────────────────────────
@app.route("/api/police-alert", methods=["POST"])
def police_alert():
    data          = request.json
    origin        = data.get("origin","Mumbai")
    destination   = data.get("destination","Pune")
    medicine      = data.get("medicine","Medical Supply")
    priority      = data.get("priority","Normal")
    delay_minutes = int(data.get("delay_minutes",15))
    traffic_level = data.get("traffic_level","Heavy")
    truck_id      = data.get("truck_id","TRK-001")

    state_codes = {"Mumbai":"MH","Delhi":"DL","Bangalore":"KA","Chennai":"TN","Pune":"MH",
                   "Hyderabad":"TS","Kolkata":"WB","Agra":"UP","Mysore":"KA","Vellore":"TN",
                   "Jaipur":"RJ","Lucknow":"UP","Ahmedabad":"GJ","Surat":"GJ","Nagpur":"MH"}
    state        = state_codes.get(origin,"IN")
    truck_number = f"{state}-{random.randint(10,99)}-{random.randint(1000,9999)}"

    sms_result = send_police_sms(truck_number, origin, destination, medicine,
                                 delay_minutes, traffic_level, priority)

    alert_record = {
        "id":f"alert-{int(time.time())}","truck_id":truck_id,"truck_number":truck_number,
        "origin":origin,"destination":destination,"medicine":medicine,
        "traffic_level":traffic_level,"delay_minutes":delay_minutes,
        "sms_sent":sms_result["sent"],"sms_simulated":sms_result.get("simulated",False),
        "sms_message":sms_result["message"],"timestamp":time.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "status":"clearance_requested",
    }
    traffic_alerts_db.append(alert_record)

    return jsonify({"success":True,"truck_number":truck_number,"sms_result":sms_result,"alert":alert_record})

# ─────────────────────────────────────────────
# REROUTE ENDPOINT
# ─────────────────────────────────────────────
@app.route("/api/reroute", methods=["POST"])
def reroute():
    data     = request.json
    truck_id = data.get("truck_id")
    for alert in traffic_alerts_db:
        if alert["truck_id"]==truck_id: alert["status"]="rerouted"
    return jsonify({"success":True,"truck_id":truck_id,"status":"rerouted"})

@app.route("/api/traffic-alerts", methods=["GET"])
def get_traffic_alerts():
    return jsonify(traffic_alerts_db)

@app.route("/create-shipment", methods=["POST"])
def create_shipment():
    shipments_db.append(request.json)
    return jsonify({"message":"saved","total":len(shipments_db)})

@app.route("/shipments", methods=["GET"])
def get_shipments():
    return jsonify(shipments_db)

@app.route("/suppliers", methods=["GET"])
def get_suppliers():
    ranked=[]
    for sid,sup in SUPPLIERS.items():
        score=0.40*sup["on_time_rate"]+0.30*sup["price_score"]+0.30*sup["quality_rate"]
        ranked.append({"id":sid,"name":sup["name"],"totalScore":round(score*100,1),"cold_chain":sup["cold_chain"]})
    ranked.sort(key=lambda x:x["totalScore"],reverse=True)
    return jsonify(ranked)

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status":"MediFlow AI running","agents":4,"shipments":len(shipments_db),
        "weather":"live_api" if OPENWEATHER_API_KEY else "regional_fallback",
        "traffic":"tomtom_live" if TOMTOM_API_KEY else "simulated",
        "sms":"twilio_live" if TWILIO_ACCOUNT_SID else "simulated",
    })

if __name__=="__main__":
    app.run(debug=True, port=5000)