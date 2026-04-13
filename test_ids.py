import json

with open('./data/events.json', 'r') as f:
    events = json.load(f)

for e in events:
    if e.get('id') == "monaco-grand-prix-2026":
        print(json.dumps(e.get('confirmedAttendees'), indent=2))
