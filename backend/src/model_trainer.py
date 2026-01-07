import xgboost as xgb
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error
import os

def train_model(df):
    """
    Trains an XGBoost model on the provided dataframe.
    Returns the trained model and the MAE on test set.
    """
    # Define Features & Target
    features = ['ATM_ID', 'Is_Weekend', 'Is_Payday', 'Is_Festival', 'Net_Flow_Lag_7', 'Net_Flow_Rolling_3']
    X = df[features]
    y = df['Net_Cash_Flow']

    # Train/Test Split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, shuffle=False)

    # Train XGBoost Model
    print("Training XGBoost Model...")
    model = xgb.XGBRegressor(objective='reg:squarederror', n_estimators=100, learning_rate=0.1, max_depth=5)
    model.fit(X_train, y_train)

    # Evaluate Performance
    preds = model.predict(X_test)
    mae = mean_absolute_error(y_test, preds)
    print(f"Model Training Complete. MAE: {mae:.2f}")
    
    return model, mae

def save_model(model, path='backend/models/xgb_model.json'):
    """Saves the trained model to disk."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    model.save_model(path)
    print(f"Model saved to {path}")

def load_model(path='backend/models/xgb_model.json'):
    """Loads the trained model from disk."""
    model = xgb.XGBRegressor()
    model.load_model(path)
    return model
