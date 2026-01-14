import os
from datetime import datetime, timezone, timedelta

import numpy as np
import pandas as pd

from dotenv import load_dotenv
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sqlalchemy import create_engine, text
import json

load_dotenv()
SQLALCHEMY_DATABASE_URL = os.environ.get("SQLALCHEMY_DATABASE_URL", os.environ["DATABASE_URL"])

def utc_now():
    return datetime.now(timezone.utc)

def label_for_centroid(c):
    # c is in standardized space, we will label using heuristics on raw later
    return "General"

def main(k=3, days=30):
    end = utc_now()
    start = end - timedelta(days=days)
    start_day = datetime(start.year, start.month, start.day, tzinfo=timezone.utc)
   
    engine = create_engine(SQLALCHEMY_DATABASE_URL)

    df = pd.read_sql(
        """
            SELECT "userId", day,
                "createdCount", "completedCount", "completionRate",
                "overdueCount", "avgCompletionLagH",
                "createdMorning", "createdAfternoon", "createdEvening", "createdNight"
            FROM "DailyUserFeatures"
            WHERE day >= %(start)s
        """,
        con=engine,
        params={"start": start_day},
    )

    if df.empty:
        print("[cluster] no data")
        return

    # Aggregate per user across window
    agg = df.groupby("userId").agg({
        "createdCount": "sum",
        "completedCount": "sum",
        "completionRate": "mean",
        "overdueCount": "mean",
        "avgCompletionLagH": "mean",
        "createdMorning": "sum",
        "createdAfternoon": "sum",
        "createdEvening": "sum",
        "createdNight": "sum",
    }).reset_index()

    # Build feature matrix
    feature_cols = [
        "createdCount","completedCount","completionRate",
        "overdueCount","avgCompletionLagH",
        "createdMorning","createdAfternoon","createdEvening","createdNight"
    ]
    X = agg[feature_cols].to_numpy(dtype=float)

    # Edge: if fewer users than k
    k_eff = min(int(k), X.shape[0])
    if k_eff < 1:
        print("[cluster] not enough users")
        return

    scaler = StandardScaler()
    Xs = scaler.fit_transform(X)

    km = KMeans(n_clusters=k_eff, n_init=20, random_state=42)
    labels = km.fit_predict(Xs)

    # Inverse transform centroids for interpretability
    centroids_raw = scaler.inverse_transform(km.cluster_centers_)

    # Simple persona labels based on raw centroid stats
    persona_labels = {}
    for i, c in enumerate(centroids_raw):
        created, completed, rate, overdue, lag, m, a, e, n = c
        if rate >= 0.7 and overdue < 1:
            persona = "Finisher"
        elif created > 20 and rate < 0.5:
            persona = "Overplanner"
        elif n > max(m,a,e):
            persona = "Night Owl"
        elif overdue >= 2:
            persona = "Deadline Struggler"
        else:
            persona = "Balanced"
        persona_labels[i] = persona

    with engine.begin() as connection:
        for idx, row in agg.iterrows():
            user_id = row["userId"]
            seg = int(labels[idx])
            centroid = {col: float(v) for col, v in zip(feature_cols, centroids_raw[seg])}

            connection.execute(
                text("""
                    INSERT INTO "UserSegment" ("userId", segment, label, centroid, "featuresRef")
                    VALUES (:userId, :segment, :label, CAST(:centroid AS jsonb), CAST(:featuresRef AS jsonb))
                    ON CONFLICT ("userId")
                    DO UPDATE SET
                    segment = EXCLUDED.segment,
                    label = EXCLUDED.label,
                    centroid = EXCLUDED.centroid,
                    "featuresRef" = EXCLUDED."featuresRef",
                    "updatedAt" = now()
                """),
                {
                    "userId": user_id,
                    "segment": seg,
                    "label": persona_labels[seg],
                    "centroid": json.dumps(centroid),
                    "featuresRef": json.dumps({"windowDays": days, "from": start_day.isoformat()}),
                }
            )

    print(f"[cluster] clustered users={len(agg)} k={k_eff}")

if __name__ == "__main__":
    main()
