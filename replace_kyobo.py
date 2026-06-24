with open('UserJourney-Agent.json', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace the label 'Kyobo Building' with 'Kyobo'
# But keep the value as 'Kyobo Building ...'
text = text.replace('Kyobo Building|', 'Kyobo|')

with open('UserJourney-Agent.json', 'w', encoding='utf-8') as f:
    f.write(text)

print("Done replacing Kyobo Building| with Kyobo|")
