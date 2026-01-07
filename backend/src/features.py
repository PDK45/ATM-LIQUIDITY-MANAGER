import pandas as pd

def add_advanced_features(df):
    """
    Adds Lag and Rolling features to capture seasonality and trends.
    """
    # Sort to ensure shifts work correctly
    df = df.sort_values(by=['ATM_ID', 'Date'])
    
    # 1. LAG FEATURE: "What was the Net Flow on this day last week?" (Weekly Seasonality)
    df['Net_Flow_Lag_7'] = df.groupby('ATM_ID')['Net_Cash_Flow'].shift(7)
    
    # 2. ROLLING MEAN: "Average Net Flow of last 3 days" (Short-term Trend)
    df['Net_Flow_Rolling_3'] = df.groupby('ATM_ID')['Net_Cash_Flow'].transform(lambda x: x.rolling(window=3).mean())
    
    # Drop NaNs created by shifting (First 7 days will be empty)
    df = df.dropna().reset_index(drop=True)
    
    return df
