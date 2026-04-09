import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier
import joblib

# Load trained model
model = joblib.load("model.pkl")

def predict_risk(data):
    df = pd.DataFrame([data])
    prediction = model.predict(df)
    return int(prediction[0])