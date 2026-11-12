import os

from pymongo import MongoClient

def extract_different_user_agents(mongo_uri: str, db_name: str, collection_name: str, output_path: str):
    """
    Подключается к MongoDB, перебирает все документы в указанной коллекции,
    сравнивает первый userAgent в logs с остальными и сохраняет отличающиеся в файл.
    """
    client = MongoClient(mongo_uri)
    db = client[db_name]
    coll = db[collection_name]

    with open(output_path, 'w', encoding='utf-8') as f:
        # Проходим по всем документам
        for doc in coll.find({}, {'logs.additional.userAgent': 1}):
            logs = doc.get('logs', [])
            if len(logs) < 2:
                # Нет второго элемента — нечего сравнивать
                continue

            first_ua = logs[0].get('additional', {}).get('userAgent')
            if not first_ua:
                # Первый UA отсутствует, пропускаем
                continue

            # Сравниваем первый UA со всеми остальными
            for entry in logs[1:]:
                ua = entry.get('additional', {}).get('userAgent')
                if ua and ua != first_ua:
                    # Записываем документ и несовпадающий UA
                    f.write(f"{doc['_id']}:    {ua}\n")
    client.close()

if __name__ == "__main__":
    MONGO_URI = os.getenv("MONGO_URI", "mongodb://127.0.0.1:27017")
    DB_NAME = os.getenv("DB_NAME", "mygame")
    COLL_NAME = os.getenv("LOGS_COLLECTION", "playerlogs")
    OUTPUT_FILE = os.getenv("OUTPUT_FILE", "different_user_agents.txt")

    extract_different_user_agents(MONGO_URI, DB_NAME, COLL_NAME, OUTPUT_FILE)
    print(f"Готово! Проверьте файл {OUTPUT_FILE}.")
