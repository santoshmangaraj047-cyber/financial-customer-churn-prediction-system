import sys
import pandas as pd
import numpy as np
import joblib
import os

MODEL_PATH = os.path.join(os.path.dirname(__file__), 'rf_model.joblib')


def normalize_col(name):
    return name.strip().lower().replace(' ', '').replace('_', '')


def pick_display_col(df, model_bundle):
    display_col = model_bundle.get('display_col')
    if display_col and display_col in df.columns:
        return display_col

    candidates = ['Surname', 'CustomerName', 'Name', 'CustomerId', 'customerID']
    for col in candidates:
        if col in df.columns:
            return col
    return df.columns[0]


def find_optional_col(df, keys):
    normalized = {col: normalize_col(col) for col in df.columns}
    for col, key in normalized.items():
        if key in keys:
            return col
    return None


def load_input_table(input_path):
    ext = os.path.splitext(input_path)[1].lower()
    if ext in ['.xlsx', '.xls']:
        return pd.read_excel(input_path)
    return pd.read_csv(input_path)


def load_model():
    return joblib.load(MODEL_PATH)


def predict_single(input_dict):
    data = pd.DataFrame([input_dict])
    model_bundle = load_model()
    model = model_bundle['model']
    features = model_bundle['features']
    data = pd.get_dummies(data)
    for col in features:
        if col not in data.columns:
            data[col] = 0
    data = data[features]
    proba = model.predict_proba(data)[0][1]
    pred = model.predict(data)[0]
    return int(pred), float(proba)


def predict_batch(input_path):
    df = load_input_table(input_path)
    model_bundle = load_model()
    model = model_bundle['model']
    features = model_bundle['features']

    display_col = pick_display_col(df, model_bundle)
    names = df[display_col].astype(str).tolist()

    region_col = find_optional_col(df, ['geography', 'region', 'state'])
    account_col = find_optional_col(df, ['accounttype', 'account_type', 'product'])

    regions = df[region_col].astype(str).tolist() if region_col else ['Unknown'] * len(df)
    account_types = df[account_col].astype(str).tolist() if account_col else ['Unknown'] * len(df)

    drop_cols = set(model_bundle.get('drop_cols', []))
    target_col = model_bundle.get('target_col')
    if target_col:
        drop_cols.add(target_col)
    X = df.drop(columns=[col for col in drop_cols if col in df.columns], errors='ignore')

    X = pd.get_dummies(X)
    for col in features:
        if col not in X.columns:
            X[col] = 0
    X = X[features]

    classes = getattr(model, 'classes_', [0, 1])
    if len(classes) == 2:
        positive_class = 1 if 1 in classes else classes[-1]
        positive_idx = list(classes).index(positive_class)
        probas = model.predict_proba(X)[:, positive_idx]
    else:
        probas = model.predict_proba(X).max(axis=1)

    preds = model.predict(X)
    normalized_preds = []
    for pred in preds:
        try:
            pred_value = int(pred)
        except Exception:
            pred_value = 1 if str(pred).lower() in ['true', 'yes', 'churn'] else 0
        normalized_preds.append(pred_value)

    return list(zip(names, normalized_preds, probas, regions, account_types))


def main():
    import json
    if len(sys.argv) != 2:
        print('Usage: python predict.py <input.json|input.csv|input.xlsx|->')
        sys.exit(1)

    input_arg = sys.argv[1]

    if input_arg == '-':
        raw = sys.stdin.read().strip()
        if not raw:
            print('No input received on stdin')
            sys.exit(1)
        input_dict = json.loads(raw)
        pred, proba = predict_single(input_dict)
        print(json.dumps({'prediction': pred, 'probability': proba}))
        return

    if input_arg.endswith('.json'):
        with open(input_arg, 'r') as f:
            input_dict = json.load(f)
        pred, proba = predict_single(input_dict)
        print(json.dumps({'prediction': pred, 'probability': proba}))
        return

    if os.path.exists(input_arg):
        results = predict_batch(input_arg)
        for name, pred, proba, region, account_type in results:
            safe_name = str(name).replace(',', ' ')
            safe_region = str(region).replace(',', ' ')
            safe_account_type = str(account_type).replace(',', ' ')
            print(f'{safe_name},{pred},{proba},{safe_region},{safe_account_type}')
        return

    print('Usage: python predict.py <input.json|input.csv|input.xlsx|->')
    sys.exit(1)


if __name__ == '__main__':
    main()
