import random
random.seed(42)
number = 0
even = 0
odd = 0
for i in range(100):
    number = random.randint(0, 100)
    print(number)
    if number % 2 == 0:
        even+=1
    else:        
        odd+=1
print(f"Even numbers: {even}, Odd numbers: {odd}")