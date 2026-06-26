import pandas as pd
import numpy as np
import json
import ast
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import os

def load_data():
    print("Loading datasets...")
    movies = pd.read_csv('tmdb_5000_movies.csv')
    credits = pd.read_csv('tmdb_5000_credits.csv')
    
    # Merge datasets
    df = movies.merge(credits, on='title')
    return df

def safe_literal_eval(val):
    try:
        return ast.literal_eval(val)
    except Exception:
        return []

def extract_genres(obj):
    return [i['name'] for i in safe_literal_eval(obj)]

def extract_keywords(obj):
    return [i['name'] for i in safe_literal_eval(obj)]

def extract_cast(obj):
    # Extract top 3 actors
    cast_list = safe_literal_eval(obj)
    return [cast_list[i]['name'] for i in range(min(3, len(cast_list)))]

def extract_director(obj):
    for i in safe_literal_eval(obj):
        if i.get('job') == 'Director':
            return i['name']
    return ""

def main():
    df = load_data()
    
    print("Processing movie metadata...")
    # Keep raw metadata for front-end rendering
    processed_movies = []
    
    # Drop rows without overview or title
    df.dropna(subset=['overview', 'title', 'movie_id'], inplace=True)
    df.drop_duplicates(subset=['title'], inplace=True)
    
    # Pre-parse features
    df['genres_list'] = df['genres'].apply(extract_genres)
    df['keywords_list'] = df['keywords'].apply(extract_keywords)
    df['cast_list'] = df['cast'].apply(extract_cast)
    df['director_name'] = df['crew'].apply(extract_director)
    
    # Build clean metadata records for frontend
    for idx, row in df.iterrows():
        processed_movies.append({
            "id": int(row['movie_id']),
            "title": str(row['title']),
            "overview": str(row['overview']),
            "genres": row['genres_list'],
            "cast": row['cast_list'],
            "director": row['director_name']
        })
        
    print(f"Metadata processed for {len(processed_movies)} movies.")
    
    # Preprocess text tokens for recommendation engine
    # 1. Clean spaces from words to make them single tokens
    genres_token = df['genres_list'].apply(lambda x: [i.replace(" ", "") for i in x])
    keywords_token = df['keywords_list'].apply(lambda x: [i.replace(" ", "") for i in x])
    cast_token = df['cast_list'].apply(lambda x: [i.replace(" ", "") for i in x])
    director_token = df['director_name'].apply(lambda x: [x.replace(" ", "")] if x else [])
    overview_token = df['overview'].apply(lambda x: str(x).split() if pd.notna(x) else [])
    
    # 2. Combine into tags
    df['tags'] = overview_token + genres_token + keywords_token + cast_token + director_token
    df['tags'] = df['tags'].apply(lambda x: " ".join(x).lower())
    
    print("Computing recommendation matrices...")
    # Count Vectorizer
    cv = CountVectorizer(max_features=5000, stop_words='english')
    vectors = cv.fit_transform(df['tags']).toarray()
    
    # Cosine Similarity
    similarity = cosine_similarity(vectors)
    
    # Map title to index for lookup
    df.reset_index(drop=True, inplace=True)
    
    recommendations_map = {}
    print("Precomputing movie recommendations...")
    for idx, row in df.iterrows():
        title = row['title']
        distances = similarity[idx]
        # Sort recommendations (skip element at index 0 which is the movie itself after sorting)
        similar_indices = sorted(list(enumerate(distances)), reverse=True, key=lambda x: x[1])[1:9]
        
        sim_list = []
        for sim_idx, score in similar_indices:
            sim_row = df.iloc[sim_idx]
            sim_list.append({
                "id": int(sim_row['movie_id']),
                "title": str(sim_row['title']),
                "score": round(float(score), 4)
            })
        recommendations_map[title] = sim_list
        
    # Write JSON outputs
    print("Saving processed data to JSON files...")
    with open('movies_list.json', 'w', encoding='utf-8') as f:
        json.dump(processed_movies, f, indent=2, ensure_ascii=False)
        
    with open('recommendations.json', 'w', encoding='utf-8') as f:
        json.dump(recommendations_map, f, indent=2, ensure_ascii=False)
        
    print("Preprocessing completed successfully!")

if __name__ == "__main__":
    main()
