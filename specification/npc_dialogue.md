# NPC Dialogue
Note: The characters should be genderless to avoid gender bias. They are numbers after all. Therefore, if you have to refer to 'him' or 'her', instead use 'them' or 'they'.

This file contains NPC dialogue which should be used as the source of truth for the dialogue in each level. 

This gives me, the human writer, control of the narrative and explanations of the mathematical concepts and teachings.

If dialogue does not yet exist for a level you are creating, you are free to create new dialogue as placeholders and for testing. I will then update these later.

Dialogue in this file will be shown as: 
```
<character number>: 
- <line 1>
- <line 2>
```

For example: 
```
3.2: 
- Hello
```

This allows for multiple bullet points in a single interaction. This signifies when a user should press 'enter' to see the next line

If the pi character is speaking, the character number is `pi`. For example: 
```
pi: 
- Where am I?
```

Breaks in dialogue requiring the user to press enter will be shown as bullet points below the character name

Note: If {} are used in a line of text, these means fill that variable with a value

## Level 0

pi: 
- Arghh.... Hmmm.... Where am I? 
- How did I get here?
- I can't remember anything...
- I guess I should explore...

At this point the user should be shown how to move around the map using up, down, left and right

After passing this movement tutorial, the user should be free to explore. They will then discover other number characters to talk to. 

13:
- You there! You look shy.
- Come, let me show you how to interact with other numbers.
- Walk up to me and press 'Enter'

Pi does this 

13:
- There you go, simple. Now with the ice broken, let me introduce myself.
- I am the number thirteen. Positive. Rational. Integer. Prime. 
- It's a pleasure to meet you. And you are...?

At this point, pi realises they don't know and can't answer. 
pi: 
- Umm... I'm not sure... I can't remember...

13:
- Oh dear. 
- Oh dear, oh dear.
- I'm not sure I can have a civilised conversation with someone who doesn't even know who they are.
- You could be a ruffian. Or a thug. And neither of us would know!

If the user comes back to 13, 13 should say:
13:
- Any luck remembering who you are yet?

Otherwise, pi can carry on finding other characters. In any order:

2.14:
- Why hello there! My name is two point one four.
- I am positive and a decimal.
- I'm not one of those integers; there's so much more to me than that.

root 2:
- I'm irrational you know. Root two's the name.
- You can't express me as a fraction. Feel free to try.

-4:
- Negative four. At your service. 
- You look a bit blank. You do know numbers can be negative don't you?

0:
- I am absolutely unique!
- Am I positive or negative?
- Push me the smallest amount one way or the other and the answer becomes obvious. 
- But what do you think I am?

e:
- Hmm... Ahh... What?
- Sorry, I was away with the fairies then.
- I'm a transcendental number you know. Quite rare... 
- My value is 2.7182818284590452353602874713527... and umm... some more I think. I find it impossible to remember it all.

After finding and talking to at least 3 of the NPCs, pi can continue on to level 1.

## Level 1

The only NPC in this level is '1'

1:
- I know you who are! You're called Pi. 
- Your value? No I can't remember that I'm afraid... 
- But I can remember a way to estimate it!
- Trace out a circle, any circle, to calculate its length. This is called its circumference.
- Then divide that by its diameter. That is, any straight line through its center.
- That will give you your value! Or at least, a good estimate of it depending on how accurately you trace out the circumference and diameter.
- There's a circular orbit over there. Go try it out!

If pi comes back to 1 before tracing the orbit and diameter, 1 should say:

1:
- How did you get on? Did you trace out the circumference and diameter of that orbit?

After the first answer is found (which should be 4)

1: 
- Well done! Now let's try a different orbit and see if we get the same answer.

And after the second answer (which should also be 4)

1:
- Hmm, that's interesting! We got exactly the same answer for a different sized circle! Let's try one more.

And after the third answer (which should also be 4)

1:
- Still 4! Is that your value? 
- I don't think it can be though because we didn't trace the circle exactly. I wonder what is going on here?
- Which of our measurements wasn't accurate? 
- Do you think this is a high estimate or low estimate for your true value? 
- Drag the answer into one of the boxes above and keep track of your estimates. Hopefully you can then find your true value!

If for the second interaction, the values don't match, instead say:

1: 
- Hmm, that's interesting! A different answer. Let's try one more.

If for the third interaction, all three values don't match, instead say:
- Hmm {value_1}, {value_2} and {value_3}. I wonder what is going on here?
- Well, this was only an estimate after all. 
- Which one do you think you drew most accurately?
- Do you think this is a high estimate or low estimate for your true value? 
- Drag the answer into one of the boxes above and keep track of your estimates. Hopefully you can then find your true value!

## Level 2

The only NPC in this level is '2'

2:
- Ah yes, I know of you. You are known as Pi.
- Your value? Hmmm. I am pretty sure I remember a way to calculate it....
- Ah yes, an infinite sequence. That is, one that goes on forever. We don't have that long I'm afraid so we will only be able to estimate your value.
- The sequence which can help us is known as the Leibniz series and it is: π/4 = 1 − 1/3 + 1/5 − 1/7 + ...
- Do you see the pattern?
- To find your value, we can multiply both sides by 4 and calculate: π = 4 − 4/3 + 4/5 − 4/7 + ...
- My star forge can help us! Feed my star fire crystals to heat it up and ice crystals to cool it down following this sequence. It's final change in temperature will tell us Pi. I'll keep track of it for you along the top. 

The next level unlocks after 6 terms are calculated. However, the user can optionally carry on to 20 terms. 

If pi comes back to 2 before finishing the first 6 terms:

2:
- How are you getting on? Try at least {n, where n is 6 minus the number of terms done} more terms

After 6 terms, 2 says the following without Pi needing to walk up to them and press enter:
2:
- Well done! {value found}. Can you see the pattern we are making?
- Keep track of {value found} as an estimate. Do you think it is a high or a low estimate?
- You are welcome to use more of my crystals if you want to improve your estimate.

After 20 terms, no more ice or fire crystals appear and if Pi goes back to 2 they say:
2:
- I'm sorry. I'm out of crystals. That's as much as I can help you. Try traveling through a portal to find someone else to help you.

