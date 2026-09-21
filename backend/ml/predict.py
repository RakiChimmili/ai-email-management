import sys
import joblib
import os
import json


# Get the folder containing predict.py
base_dir = os.path.dirname(os.path.abspath(__file__))

# Load the new real spam model
model_path = os.path.join(base_dir, "spam_model.pkl")

model = joblib.load(model_path)


# Get email text
text = sys.argv[1]


# Predict spam / ham
prediction = model.predict([text])[0]

# Get probability of spam
spam_probability = model.predict_proba([text])[0][1]




# Return result
result = {
    "spam": prediction == "spam",
    "spamScore": round(float(spam_probability), 2)
}

print(json.dumps(result))