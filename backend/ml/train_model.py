import os
import re
import joblib
import pandas as pd

from email import policy
from email.parser import BytesParser

from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, accuracy_score


# --------------------------------------------------
# 1. Paths
# --------------------------------------------------

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

HAM_DIR = os.path.join(BASE_DIR, "dataset", "easy_ham")
SPAM_DIR = os.path.join(BASE_DIR, "dataset", "spam")

MODEL_PATH = os.path.join(BASE_DIR, "spam_model.pkl")


# --------------------------------------------------
# 2. Extract text from email
# --------------------------------------------------

def extract_email_text(file_path):

    try:
        with open(file_path, "rb") as file:
            message = BytesParser(policy=policy.default).parse(file)

        subject = message.get("subject", "")

        body = ""

        if message.is_multipart():

            for part in message.walk():

                if part.get_content_type() == "text/plain":
                    try:
                        body = part.get_content()
                    except Exception:
                        body = ""

                    if body:
                        break

        else:

            try:
                body = message.get_content()
            except Exception:
                body = ""

        text = f"{subject} {body}"

        # Remove excessive whitespace
        text = re.sub(r"\s+", " ", text)

        return text.strip()

    except Exception as error:

        print(f"Error reading {file_path}: {error}")
        return ""


# --------------------------------------------------
# 3. Load dataset
# --------------------------------------------------

texts = []
labels = []


print("Reading ham emails...")

for filename in os.listdir(HAM_DIR):

    file_path = os.path.join(HAM_DIR, filename)

    if os.path.isfile(file_path):

        text = extract_email_text(file_path)

        if text:
            texts.append(text)
            labels.append("ham")


print("Reading spam emails...")

for filename in os.listdir(SPAM_DIR):

    file_path = os.path.join(SPAM_DIR, filename)

    if os.path.isfile(file_path):

        text = extract_email_text(file_path)

        if text:
            texts.append(text)
            labels.append("spam")


# --------------------------------------------------
# 4. Create DataFrame
# --------------------------------------------------

df = pd.DataFrame({
    "text": texts,
    "label": labels
})


print("\nDataset information:")
print(df["label"].value_counts())

print(f"\nTotal emails: {len(df)}")


# --------------------------------------------------
# 5. Remove duplicates and empty emails
# --------------------------------------------------

df = df.drop_duplicates(subset="text")

df = df[df["text"].str.strip() != ""]

print(f"\nAfter cleaning: {len(df)} emails")


# --------------------------------------------------
# 6. Split dataset
# --------------------------------------------------

X_train, X_test, y_train, y_test = train_test_split(
    df["text"],
    df["label"],
    test_size=0.20,
    random_state=42,
    stratify=df["label"]
)


# --------------------------------------------------
# 7. Build improved NLP + ML model
# --------------------------------------------------

model = Pipeline([

    (
        "tfidf",
        TfidfVectorizer(
            lowercase=True,
            stop_words="english",
            ngram_range=(1, 2),
            min_df=2,
            max_df=0.98,
            sublinear_tf=True,
            max_features=50000
        )
    ),

    (
        "classifier",
        LogisticRegression(
            max_iter=2000,
            class_weight="balanced",
            C=2.0
        )
    )

])


# --------------------------------------------------
# 8. Train model
# --------------------------------------------------

print("\nTraining improved spam detection model...")

model.fit(X_train, y_train)


# --------------------------------------------------
# 9. Evaluate model
# --------------------------------------------------

predictions = model.predict(X_test)

accuracy = accuracy_score(y_test, predictions)

print("\nModel evaluation:")

print(f"\nAccuracy: {accuracy:.4f}\n")

print(classification_report(y_test, predictions))


# --------------------------------------------------
# 10. Save model
# --------------------------------------------------

joblib.dump(model, MODEL_PATH)

print("\nImproved spam model saved successfully!")

print(MODEL_PATH)