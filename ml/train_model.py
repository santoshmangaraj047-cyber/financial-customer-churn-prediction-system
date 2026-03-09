import sys
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score, precision_recall_fscore_support
import joblib
import os
import json
from datetime import datetime, timezone

MODEL_PATH = os.path.join(os.path.dirname(__file__), 'rf_model.joblib')
MODEL_META_PATH = os.path.join(os.path.dirname(__file__), 'model_meta.json')

TARGET_CANDIDATES = ['exited', 'churn', 'is_churn', 'target', 'label']
ID_CANDIDATES = ['rownumber', 'customerid', 'customer_id', 'id']
NAME_CANDIDATES = ['surname', 'name', 'customername', 'customer_name']


def normalize_col(name):
    return name.strip().lower().replace(' ', '').replace('_', '')


def load_input_table(input_path):
    ext = os.path.splitext(input_path)[1].lower()
    if ext in ['.xlsx', '.xls']:
        return pd.read_excel(input_path, nrows=1000)
    return pd.read_csv(input_path, nrows=1000)


def find_target_col(columns):
    normalized = {col: normalize_col(col) for col in columns}
    for col, key in normalized.items():
        if key in TARGET_CANDIDATES:
            return col
    return columns[-1]


def find_display_col(columns):
    normalized = {col: normalize_col(col) for col in columns}
    for col, key in normalized.items():
        if key in NAME_CANDIDATES:
            return col
    if 'CustomerId' in columns:
        return 'CustomerId'
    return columns[0]


def find_drop_cols(columns, target_col):
    drop_cols = {target_col}
    normalized = {col: normalize_col(col) for col in columns}
    for col, key in normalized.items():
        if key in ID_CANDIDATES or key in NAME_CANDIDATES:
            drop_cols.add(col)
    return list(drop_cols)


def main():
    if len(sys.argv) < 2:
        print('Usage: python train_model.py <dataset_path>')
        sys.exit(1)
    dataset_path = sys.argv[1]

    df = load_input_table(dataset_path)
    df = df.dropna()
    if df.empty:
        raise ValueError('Dataset is empty after removing missing rows')

    target_col = find_target_col(list(df.columns))
    display_col = find_display_col(list(df.columns))
    drop_cols = find_drop_cols(list(df.columns), target_col)

    y = df[target_col]
    if y.dtype == object:
        y_map = {'yes': 1, 'true': 1, 'churn': 1, '1': 1, 'no': 0, 'false': 0, '0': 0}
        y = y.astype(str).str.strip().str.lower().map(y_map)
    y = pd.to_numeric(y, errors='coerce')

    valid_rows = y.notna()
    X = df.loc[valid_rows].drop(columns=[c for c in drop_cols if c in df.columns])
    y = y.loc[valid_rows].astype(int)

    if y.nunique() != 2:
        raise ValueError(f"Target column '{target_col}' must be binary (0/1). Found {y.nunique()} unique values.")

    X = pd.get_dummies(X)

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    clf = RandomForestClassifier(n_estimators=10, random_state=42)
    clf.fit(X_train, y_train)

    joblib.dump(
        {
            'model': clf,
            'features': list(X.columns),
            'target_col': target_col,
            'drop_cols': drop_cols,
            'display_col': display_col
        },
        MODEL_PATH
    )

    y_pred = clf.predict(X_test)
    accuracy = float(accuracy_score(y_test, y_pred))
    precision, recall, f1_score, _ = precision_recall_fscore_support(
        y_test, y_pred, average='binary', zero_division=0
    )

    meta = {
        'trained_at': datetime.now(timezone.utc).isoformat(),
        'dataset': os.path.basename(dataset_path),
        'target_column': target_col,
        'display_column': display_col,
        'total_samples': int(len(y)),
        'train_samples': int(len(X_train)),
        'test_samples': int(len(X_test)),
        'accuracy': float(accuracy),
        'precision': float(precision),
        'recall': float(recall),
        'f1_score': float(f1_score),
    }
    with open(MODEL_META_PATH, 'w', encoding='utf-8') as f:
        json.dump(meta, f, indent=2)

    print('Training complete!')
    print(f'Target column: {target_col}')
    print(f'Display column: {display_col}')
    print(f'Accuracy: {accuracy:.4f}')
    print(classification_report(y_test, y_pred))
    print(f'Model saved to {MODEL_PATH}')
    print(f'Metadata saved to {MODEL_META_PATH}')


if __name__ == '__main__':
    main()
