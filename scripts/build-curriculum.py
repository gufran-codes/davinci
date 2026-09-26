"""Reproducible authored baseline. Every new record stays draft pending human review."""
import json, pathlib
out=[]
sources={'Math':('CCSS','https://www.thecorestandards.org/Math/'),'English':('CCSS ELA','https://www.thecorestandards.org/ELA-Literacy/'),'Science':('NGSS','https://www.nextgenscience.org/search-standards'),'Social Studies':('C3 scope','https://www.socialstudies.org/standards/c3')}
def add(grade,subject,domain,topic,name,objective,cases,prereq=None,terms=None,glossary=None):
    sid=f"g{grade}_{subject.lower().replace(' ','_')}_{topic}"
    framework,source=sources[subject]
    questions=[]
    for i,(prompt,answer,reason,visuals) in enumerate(cases):
        questions.append(dict(role=['diagnostic','practice','mastery'][i%3],prompt=prompt,answer=str(answer),explanation=reason,context=objective,hint=f"Think about {name.lower()}. {objective}",visuals=visuals))
    if len(questions)<3:
        base=questions[0]; questions.append({**base,'role':'mastery','prompt':f"Explain your thinking: {base['prompt']}"})
    keyterms=terms or [str(cases[0][1])]
    out.append(dict(id=sid,name=name,grade=grade,subject=subject,domain=domain,topic=topic,objective=objective,prerequisites=prereq or ([f"g{grade-1}_{subject.lower().replace(' ','_')}_{topic}"] if grade>1 else []),misconceptions=[],strategies=['guided_questioning','concrete_real_world_example','compare_contrast','evidence_first' if subject!='Math' else 'symbolic_first','partial_worked_example'],standards=[dict(framework=framework,reference=f'Grade {grade}: {domain}',source=source,alignment='scope-reference')],status='draft',provenance='AI-authored baseline; deterministic validation is not human curriculum review.',reviewer=None,questions=questions,rubric=dict(criteria=[dict(id='concept',description=objective,terms=keyterms,weight=1),dict(id='reason',description='Connect a claim to a reason or example.',terms=['because','so','means','shows','for example','therefore'],weight=1)],minScore=.75,counterEvidence=[],sampleExplanation=cases[0][2]),glossary=glossary or {name.lower():objective}))
for g in range(1,6):
    c=[]
    for k in range(3):
        a=(g+1)*10+k*3+2;b=g+k+2
        c.append((f'There are {a} books. {b} more arrive. How many books are there now?',a+b,f'Combine the two amounts: {a} + {b} = {a+b}.',[]))
    add(g,'Math','Numbers & Operations','addition',['Adding within 100','Adding with regrouping','Adding three-digit numbers','Multi-digit addition','Decimal addition'][g-1],'Combine quantities while keeping place values aligned.',c,terms=['combine','add','total','place'])
    c=[]
    for k in range(3):
        a=(g+1)*20+k*5;b=g*4+k
        c.append((f'A box holds {a} pencils. {b} are used. How many remain?',a-b,f'Take the used pencils from the starting total: {a} − {b} = {a-b}.',[]))
    add(g,'Math','Numbers & Operations','subtraction','Subtracting quantities','Find what remains or the difference between quantities.',c,terms=['subtract','difference','take away','remain'])
    c=[]
    for k in range(3):
        tens=g+k+2;ones=k+1;value=tens*10+ones
        c.append((f'In {value}, what value does the digit {tens} represent?',tens*10,f'{tens} tens has value {tens*10}. The position tells the value.',[]))
    add(g,'Math','Numbers & Operations','place_value','Place value relationships','A digit’s position determines its value; ten units make one of the next place.',c,terms=['ten','position','place','value'])
    for topic,name,op,objective in [('counting','Counting and number patterns','count','Count forward using a consistent step.'),('multiplication','Equal groups and multiplication','mul','Find the total in equal groups.'),('division','Equal sharing and division','div','Share a quantity into equal groups.')]:
        c=[]
        for k in range(3):
            a=g+k+2;b=min(g+1,5)
            if op=='count': prompt=f'What comes next: {a}, {a+b}, {a+2*b}, ___?';ans=a+3*b;why=f'Add {b} each time.';vis=[]
            elif op=='mul':prompt=f'{a} bags each have {b} marbles. How many marbles altogether?';ans=a*b;why=f'{a} equal groups of {b} make {a*b}.';vis=[dict(type='array',rows=a,columns=b)]
            else:prompt=f'Share {a*b} counters equally into {a} groups. How many in each?';ans=b;why=f'{a*b} divided among {a} groups gives {b} in each.';vis=[dict(type='counters',total=a*b,groups=a)]
            c.append((prompt,ans,why,vis))
        add(g,'Math','Numbers & Operations',topic,name,objective,c,terms=['equal','group','each'] if op!='count' else ['add','step','pattern'])
    c=[]
    for k in range(3):
        d=[2,4,6,8,10][g-1];n=min(k+1,d-1)
        c.append((f'A strip has {d} equal parts. {n} are shaded. What fraction is shaded?',f'{n}/{d}',f'{n} selected parts out of {d} equal parts is {n}/{d}.',[dict(type='fraction_bar',numerator=n,denominator=d)]))
    add(g,'Math','Fractions','fractions','Fractions as equal parts','The denominator counts equal parts in a whole; the numerator counts selected parts.',c,terms=['equal','parts','whole','numerator','denominator'],glossary={'denominator':'The bottom number tells how many equal parts make one whole.','numerator':'The top number counts the parts we are talking about.','equivalent':'Different names for the same amount.'})
    c=[]
    for k in range(3):
        a=g+k+2;b=k+2
        c.append((f'A rectangle is {a} units long and {b} units wide. What is its perimeter?',2*(a+b),f'Add all four sides: {a}+{b}+{a}+{b}={2*(a+b)} units.',[dict(type='geometry',shape='rectangle',width=a,height=b,label='Find the distance around the shape.')]))
    add(g,'Math','Geometry','perimeter','Distance around shapes','Perimeter is the total distance around the boundary.',c,terms=['around','sides','boundary'])
    c=[]
    for k in range(3):
        a=g+k+2;b=k+2
        c.append((f'A rectangle has {a} rows of {b} unit squares. What is its area?',a*b,f'Area counts the covered unit squares: {a} × {b} = {a*b}.',[dict(type='array',rows=a,columns=b)]))
    add(g,'Math','Geometry','area','Covering an area','Area measures a surface in square units.',c,terms=['square','cover','surface','rows'])
    c=[]
    for k in range(3):
        a=g+k+2;b=a+3
        c.append((f'A pencil is {a} cm long and a ribbon is {b} cm long. How many centimetres longer is the ribbon?',b-a,f'Compare using the same unit: {b} − {a} = {b-a} cm.',[]))
    add(g,'Math','Measurement','length','Measuring and comparing length','Use equal units and compare lengths measured in the same unit.',c,terms=['unit','length','same','centimetre'])
    c=[]
    for k in range(3):
        start=g+k+1;end=start+2
        c.append((f'An activity starts at {start}:00 and finishes at {end}:00. How many hours does it last?',2,f'Count forward from {start}:00 to {end}:00: two hours.',[]))
    add(g,'Math','Measurement','time','Time and elapsed time','Find elapsed time by counting forward from start to finish.',c,terms=['start','finish','count','hour'])
    c=[]
    for k in range(3):
        coins=g+k+1
        c.append((f'You have {coins} US nickels. Each is worth 5 cents. How many cents is that?',coins*5,f'{coins} groups of 5 cents make {coins*5} cents.',[]))
    add(g,'Math','Measurement','money','Money and equal values','Add coin values, rather than only counting the coins.',c,terms=['value','cents','worth'])
    c=[]
    for k in range(3):
        apples=g+k+3;pears=g+k+1
        c.append((f'The table shows fruit votes. How many votes altogether?',apples+pears,f'Add {apples} apple votes and {pears} pear votes.',[dict(type='table',headers=['Fruit','Votes'],rows=[['Apples',str(apples)],['Pears',str(pears)]])]))
    add(g,'Math','Data','data','Reading tables and graphs','Read labels and combine or compare the recorded quantities.',c,terms=['label','data','table','total'])
    c=[]
    for k in range(3):
        a=g+k+2;b=g+1
        c.append((f'The rule is multiply by {b}, then add 1. What is the output for {a}?',a*b+1,f'First {a} × {b} = {a*b}; then add 1.',[]))
    add(g,'Math','Patterns & Algebra','rules','Input and output rules','Apply operations in the order given by a rule.',c,terms=['rule','first','then','operation'])
# Age-progressive questions below each carry a concrete fact, a task and a reason.
families={
'English':[
('Reading','phonics','Letter sounds and word parts',[
('Which word begins with the same sound as sun: sock or moon?','sock','Sun and sock begin with the /s/ sound.'),('Which word has a long a sound: cake or cat?','cake','The final e in cake helps the a say its name.'),('What prefix in replay means again?','re','The prefix re- adds the meaning again.'),('What does the prefix un- do in unhappy?','not','Un- changes happy to not happy.'),('What does the root bio mean in biology?','life','Bio relates to life, as in the study of living things.')]),
('Reading','main_idea','Finding the main idea',[
('A dog runs, jumps, and chases a ball. Is the passage mostly about a dog playing or a dog sleeping?','a dog playing','The actions all describe play.'),('Bees visit flowers. They carry pollen between flowers. Is this mainly about pollination or rain?','pollination','Both details explain how pollen moves.'),('Trees give shade, shelter animals, and clean air. What is the main idea: trees are helpful or all trees are tall?','trees are helpful','All the listed details describe benefits.'),('A town adds bus lanes and cycle paths to reduce car journeys. Is the main idea transport choices or building houses?','transport choices','Both improvements offer alternatives to car travel.'),('Wetlands hold floodwater, filter water, and shelter wildlife. State the main topic: benefits of wetlands or ocean depth?','benefits of wetlands','The details support several useful roles of wetlands.')]),
('Reading','details','Using supporting details',[
('Mina wore a red hat and blue boots. What colour were her boots?','blue','The sentence directly says blue boots.'),('At noon, a bird carried twigs to a tree. What did it carry?','twigs','Twigs is the stated object, not a guess.'),('The library opens at nine and closes at five. When does it open?','nine','The opening time is the first stated time.'),('The report says the plant in sunlight grew 8 cm; the shaded one grew 3 cm. Which grew more?','the plant in sunlight','The measurement 8 cm is greater than 3 cm.'),('A writer claims a trail is popular and reports 500 visitors on Saturday. What number supports the claim?','500','The count of visitors provides evidence for popularity.')]),
('Reading','inference','Making an inference',[
('Leo puts on boots and opens an umbrella. Is it likely raining or sunny?','raining','Boots and an umbrella are clues about rain.'),('Sara yawns and closes her book at bedtime. Is she likely tired or hungry?','tired','Yawning and bedtime support the inference.'),('The ground is wet, but the sky is now clear. What likely happened earlier: rain or snow indoors?','rain','Wet ground can remain after rain stops.'),('A character checks the clock repeatedly before an interview. Is the character likely anxious or asleep?','anxious','Repeated clock-checking suggests anticipation or worry.'),('A narrator describes a crowded street as strangely lonely. Is the feeling based on connection or the number of people alone?','connection','Being around people does not necessarily create a feeling of belonging.')]),
('Reading','sequence','Sequencing and text structure',[
('First wash hands, then eat. What happens first?','wash hands','First identifies the earlier step.'),('Plant a seed, water it, then watch it sprout. What comes after planting?','water it','Watering is the next step.'),('A recipe says mix, bake, then cool. What must happen before cooling?','bake','The sequence places baking directly before cooling.'),('A text gives a problem and then ways to fix it. Is its structure problem-solution or a timeline only?','problem-solution','Solutions are organized around a stated problem.'),('A paragraph explains causes of erosion, then its effects. What is the structure?','cause and effect','It connects what makes erosion happen with its consequences.')]),
('Vocabulary','context','Vocabulary in context',[
('The tiny ant fits on a fingertip. Does tiny mean small or loud?','small','Fitting on a fingertip supports small.'),('The parched soil had no rain for weeks. Does parched mean dry or icy?','dry','No rain explains why the soil is dry.'),('The path was narrow; only one person could pass. Does narrow mean not wide or very steep?','not wide','Only one person fitting is a width clue.'),('Her reply was brief: just two words. Does brief mean short or angry?','short','Two words indicate short length, not emotion.'),('The evidence was compelling; it convinced the careful reader. Does compelling mean persuasive or hidden?','persuasive','Convincing the reader explains the word.')]),
('Grammar','nouns_verbs','Words and their jobs',[
('In Birds sing, which word names an animal?','Birds','Birds names the animals; sing tells the action.'),('In The child runs, which word tells the action?','runs','Runs is the verb.'),('In The bright moon shines, which word describes the moon?','bright','Bright is an adjective describing moon.'),('In She walked slowly, which word describes how she walked?','slowly','Slowly modifies the verb walked.'),('In They built a bridge, which phrase receives the action?','a bridge','A bridge is what they built: the direct object.')]),
('Grammar','sentences','Sentences and punctuation',[
('What mark ends a question?','question mark','A question mark signals a question.'),('Which is a complete sentence: The dog barked or Because the dog?','The dog barked','It has a subject and a complete action.'),('Which punctuation separates items in apples, pears, and plums?','commas','Commas separate items in a list.'),('In a direct quotation, which marks show the speaker’s exact words?','quotation marks','Quotation marks enclose the words spoken.'),('Which joins related independent clauses: a semicolon or an apostrophe?','a semicolon','A semicolon can join closely related complete clauses.')]),
('Grammar','tense_agreement','Tense and agreement',[
('Choose: One cat run or One cat runs.','One cat runs','A singular cat takes runs.'),('Choose the past tense of walk: walked or walking.','walked','-ed marks the regular past tense.'),('Choose: They is ready or They are ready.','They are ready','They takes the plural verb are.'),('Which shows an action already completed: has finished or will finish?','has finished','Has finished connects a completed action to the present.'),('Choose the consistent past sequence: She opened and reads, or She opened and read.','She opened and read','Both verbs keep the narrative in past tense.')]),
('Writing','narrative','Building a narrative',[
('A story begins with who and where. Are these characters and setting or a shopping list?','characters and setting','Who gives characters; where gives setting.'),('After introducing a character, what gives the story a challenge: a problem or a page number?','a problem','A problem gives the character something to respond to.'),('What shows how a story problem ends?','resolution','The resolution explains how the conflict changes or ends.'),('What can a character’s spoken words reveal: thoughts and feelings or only spelling?','thoughts and feelings','Dialogue can show a character’s perspective.'),('Should a revision add a relevant scene or unrelated detail to develop a character?','a relevant scene','A relevant scene shows choices and develops the character.')]),
('Writing','explanation','Explaining an idea',[
('When explaining how to plant a seed, should steps be in order or mixed up?','in order','An ordered explanation is easier to follow.'),('Which sentence belongs in an explanation of brushing teeth: Use a toothbrush or Clouds are white?','Use a toothbrush','The detail stays on the topic.'),('What sentence introduces the main idea of a paragraph?','topic sentence','A topic sentence tells the paragraph’s focus.'),('Which improves an explanation: a relevant example or an unrelated opinion?','a relevant example','A relevant example makes the idea clearer.'),('Which helps readers follow an explanation: clear transitions or disconnected facts?','clear transitions','Transitions make relationships between ideas explicit.')]),
('Writing','opinion_revision','Opinions, evidence and revision',[
('I like apples is a fact or an opinion?','an opinion','Liking something is a personal preference.'),('Which supports I like this park: It has swings or My shoe is blue?','It has swings','Swings are a relevant reason for liking the park.'),('Should an opinion paragraph include reasons?','yes','Reasons explain why the writer holds the opinion.'),('A writer says a claim but gives no support. What should be added?','evidence','Evidence supports the claim with details or facts.'),('When evidence contradicts a claim, should a writer revise the claim or hide the evidence?','revise the claim','Responsible revision accounts for relevant evidence.')]),
],
'Science':[
('Life Science','living_things','Living things and their needs',[
('Does a plant need water to grow?','yes','Water supports a plant’s life processes.'),('Which is living: a growing tree or a plastic cup?','a growing tree','A tree grows and carries out life processes.'),('Which helps a cactus reduce water loss: thick stems or paper leaves?','thick stems','A cactus stores water in thick stems.'),('Are inherited traits passed from parents or chosen each morning?','passed from parents','Inherited traits are transmitted from parents to offspring.'),('Do plants get most of the material for growth from air and water or from eating soil?','air and water','Plants use carbon dioxide from air and water to build sugars and other material.')]),
('Life Science','ecosystems','Ecosystems and food relationships',[
('A rabbit eats grass. Is grass its food or its predator?','food','The grass provides material and energy for the rabbit.'),('Which habitat suits a fish: a pond or a dry cupboard?','a pond','Fish depend on an aquatic habitat.'),('In grass → rabbit → fox, what does the rabbit eat?','grass','The arrow connects food to its consumer.'),('If a food source becomes scarce, can animal populations be affected?','yes','Food availability influences survival and reproduction.'),('What breaks down dead organisms: decomposers or sunlight alone?','decomposers','Decomposers recycle matter by breaking down dead material.')]),
('Life Science','human_body','Body structures and senses',[
('Which sense uses your ears?','hearing','Ears detect sound.'),('Which body part pumps blood?','heart','The heart pumps blood through the body.'),('Which organs take in air for breathing?','lungs','Lungs exchange gases with the blood.'),('Do bones and muscles work together to move the body?','yes','Muscles pull on bones to move joints.'),('Which system carries oxygen and nutrients around the body?','circulatory system','Blood circulation transports oxygen and nutrients.')]),
('Physical Science','matter','Matter and its properties',[
('Is a wooden block a solid or a liquid?','solid','A block keeps its own shape.'),('Does liquid water take the shape of its container?','yes','A liquid flows and takes its container’s shape.'),('When ice melts, does it become water or disappear?','water','Melting changes the state, not the material’s existence.'),('Can matter be present as a gas even when you cannot see it?','yes','Air is matter and takes up space.'),('In a closed container, does total mass stay the same when salt dissolves in water?','yes','Dissolved salt remains in the closed system; mass is conserved.')]),
('Physical Science','forces','Forces and motion',[
('Is pushing a toy car a force?','yes','A push is a force that can change motion.'),('Does a pull act toward the person pulling?','yes','A pull applies force toward its source.'),('Can friction slow a sliding object?','yes','Friction resists relative motion between surfaces.'),('Can balanced forces leave an object at rest?','yes','Balanced forces have no net force changing its motion.'),('Which force pulls objects toward Earth?','gravity','Earth’s gravitational force attracts objects toward its centre.')]),
('Physical Science','energy','Energy and change',[
('Does a lamp need an energy source to shine?','yes','The lamp changes electrical energy into light and heat.'),('Can sunlight warm a dark surface?','yes','The surface absorbs energy from sunlight.'),('Is a moving ball showing energy of motion?','yes','Moving objects have kinetic energy.'),('A raised ball has stored energy due to its position. Is it potential or kinetic?','potential','Its height gives gravitational potential energy.'),('When a moving object stops through friction, can energy transfer as heat?','yes','Friction transfers energy to thermal energy; energy does not simply vanish.')]),
('Earth Science','weather','Weather observations and patterns',[
('Which tool measures temperature: a thermometer or a ruler?','a thermometer','A thermometer measures temperature.'),('Is rain a kind of precipitation?','yes','Precipitation is water falling from clouds.'),('Is climate a long-term pattern or one afternoon’s weather?','a long-term pattern','Climate describes patterns over many years.'),('Can collecting weather data over time help identify patterns?','yes','Repeated measurements reveal recurring conditions.'),('Is the Sun a major energy source driving the water cycle?','yes','Solar energy supports evaporation and helps drive the cycle.')]),
('Earth Science','earth_systems','Earth materials and systems',[
('Is sand an Earth material?','yes','Sand is made of small particles of rock and other natural material.'),('Can flowing water move soil?','yes','Moving water can carry soil and sediment.'),('What is the movement of weathered material called?','erosion','Erosion transports material from one place to another.'),('Does deposition drop transported sediment in a new place?','yes','Deposition occurs when moving sediment settles.'),('Can the atmosphere, water and land affect one another?','yes','Earth’s systems interact, for example when rainfall erodes land.')]),
('Earth Science','space','Space and observable patterns',[
('Do we usually see the Sun in the day or at night?','in the day','Earth’s rotation brings places into sunlight during daytime.'),('Does the Moon make its own visible light or reflect sunlight?','reflect sunlight','Moonlight is reflected sunlight.'),('Does Earth rotate to produce day and night?','yes','As Earth rotates, locations face toward or away from the Sun.'),('Does Earth travel around the Sun?','yes','Earth follows an orbit around the Sun.'),('Do stars appear faint partly because they are far away?','yes','Distance affects how bright a star appears from Earth.')]),
('Scientific Reasoning','investigation','Observing, predicting and testing',[
('Is The leaf is green an observation or a wish?','an observation','It describes something that can be seen.'),('Is a prediction a statement about what may happen?','yes','A prediction can be checked against later observations.'),('Should a fair test change one chosen factor at a time?','yes','Changing one factor helps identify its effect.'),('Should measurements be recorded even when they differ from a prediction?','yes','Evidence should be recorded honestly.'),('Does repeating a trial help assess reliability?','yes','Repeated trials reveal variation and whether a pattern persists.')]),
],
'Social Studies':[
('Geography','maps','Maps and location',[
('Does a map show places using symbols?','yes','Symbols represent locations and features.'),('Which map feature explains symbols?','legend','A legend tells what the map symbols mean.'),('On a usual compass rose, what is opposite north?','south','North and south are opposite compass directions.'),('A map scale is 1 cm to 2 km. Two centimetres represents how many kilometres?','4','Multiply two map centimetres by two kilometres per centimetre.'),('Do latitude lines measure position north or south of the equator?','yes','Latitude describes angular position north or south of the equator.')]),
('Geography','human_environment','People and environments',[
('Do people need places to live?','yes','Shelter is a basic need.'),('Can weather affect what people wear?','yes','People adapt clothing to conditions.'),('Can a river influence where a community develops?','yes','Rivers can provide water, transport and fertile land.'),('Can building roads change a natural environment?','yes','Road construction changes land use and habitats.'),('Can conserving water help communities in dry regions?','yes','Conservation reduces pressure on limited supplies.')]),
('Communities','community','Communities and cooperation',[
('Who helps a community put out fires: firefighters or librarians?','firefighters','Firefighters respond to fires.'),('Do neighbours cooperate when cleaning a shared park?','yes','They work together for a shared benefit.'),('Is a public library a community resource?','yes','It provides shared access to information and learning.'),('Can communities solve problems through discussion and shared action?','yes','Cooperation combines different ideas and efforts.'),('Can different groups have different priorities for the same community project?','yes','People’s needs and perspectives can differ.')]),
('Civics','rules','Rules, rights and responsibilities',[
('Can classroom rules help people learn safely?','yes','Rules set shared expectations for behaviour.'),('Is taking turns a way to treat others fairly?','yes','Turn-taking gives others a chance to participate.'),('Does having a right also involve respecting other people’s rights?','yes','Rights apply to others as well as oneself.'),('Should a fair rule apply consistently?','yes','Consistent application avoids arbitrary treatment.'),('Can a community discuss changing a rule that causes unfair results?','yes','Rules can be evaluated and revised through appropriate processes.')]),
('Civics','government','Government and public decisions',[
('Does a class vote help choose between shared options?','yes','Voting gathers choices from a group.'),('Can local government help maintain public roads?','yes','Maintaining public infrastructure is a common local responsibility.'),('Are laws rules made through government processes?','yes','Laws are established and enforced through public institutions.'),('In the US, which branch makes federal laws?','legislative','The legislative branch, Congress, makes federal laws.'),('What principle divides government power among branches?','separation of powers','Different branches have distinct responsibilities and checks.')]),
('History','timelines','Time, sequence and timelines',[
('Does yesterday come before today?','yes','Yesterday is the previous day.'),('Which comes earlier: 2001 or 2010?','2001','2001 is the smaller year number.'),('Do timelines put events in chronological order?','yes','Chronological order follows time.'),('Can events on a timeline overlap in time?','yes','Different events or processes can occur at the same time.'),('Does being earlier prove an event caused a later one?','no','Sequence alone is not enough evidence of causation.')]),
('History','sources','Sources and historical evidence',[
('Can an old photograph give clues about the past?','yes','Photographs can preserve visible evidence.'),('Is a diary written at the time a firsthand source?','yes','It records a person’s contemporary experience.'),('Can two people describe the same event differently?','yes','People notice and interpret different details.'),('Should historians compare more than one source?','yes','Comparing sources can corroborate or challenge a claim.'),('Does a source’s perspective affect how we interpret it?','yes','Purpose, experience and context shape what a source includes.')]),
('Culture','cultures','Cultures and perspectives',[
('Can families have different traditions?','yes','Traditions vary among families and communities.'),('Is listening respectfully helpful when learning about another tradition?','yes','Listening helps understanding without assuming everyone is the same.'),('Can music, language and food express culture?','yes','These are among many ways people express culture.'),('Can cultures change through contact and migration?','yes','People exchange ideas and practices over time.'),('Should one person’s experience be treated as representing every member of a culture?','no','There is diversity within cultures as well as between them.')]),
('Economics','needs_choices','Needs, wants and choices',[
('Is drinking water a need or a want?','a need','Water is necessary for life.'),('If money is limited, must people make choices?','yes','Limited resources mean not every want can be met.'),('What is the next best choice given up when making a decision?','opportunity cost','Choosing one option means giving up the best alternative.'),('Can a budget help plan how to use money?','yes','A budget organizes expected income and spending.'),('Can people weigh costs and benefits before deciding?','yes','Comparing trade-offs supports informed choices.')]),
('Economics','trade','Goods, services and trade',[
('Is a loaf of bread a good or a service?','a good','A good is a physical item people use.'),('Is a haircut a service?','yes','A haircut is work performed for someone.'),('Does a producer make goods or provide services?','yes','Producers supply goods or services.'),('Can trade let communities obtain things they do not produce?','yes','Exchange connects different resources and specializations.'),('Can specialization make communities economically interdependent?','yes','Specialized producers often rely on one another for other goods and services.')]),
]}
for subject,fs in families.items():
    for domain,topic,label,levels in fs:
        for g,(prompt,answer,reason) in enumerate(levels,1):
            objective=reason
            # Distinct tasks: identify a claim, check a claim, explain its supporting evidence.
            choices=None
            cases=[(prompt,answer,reason,[]),(f'Consider this explanation: {reason} What key idea does it support? {prompt}',answer,reason,[dict(type='passage',text=reason,highlights=[])]),(f'A classmate asks: {prompt} Give your answer and a reason.',answer,reason,[])]
            add(g,subject,domain,topic,label,objective,cases,terms=list(dict.fromkeys([answer.lower()]+[w.strip('.,').lower() for w in reason.split() if len(w)>5]))[:7])
# Rewrite higher-grade arithmetic with genuinely increasing scale/decimal demand.
for s in out:
    g=s['grade'];t=s['topic']
    if s['subject']=='Math' and t in ['addition','subtraction']:
        for k,q in enumerate(s['questions']):
            if g==1:a=8+k;b=3+k
            elif g==2:a=37+k*4;b=18+k
            elif g==3:a=248+k*15;b=137+k*3
            elif g==4:a=18425+k*101;b=7296+k*13
            else:a=round(4.25+k*.4,2);b=round(1.35+k*.2,2)
            sign='+' if t=='addition' else '−';ans=round(a+b if sign=='+' else a-b,2)
            q.update(prompt=f'What is {a} {sign} {b}?',answer=str(ans).removesuffix('.0'),explanation=f'Align matching place values, then calculate {a} {sign} {b} = {ans}.')
    if s['subject']=='Math' and t=='place_value':
        for k,q in enumerate(s['questions']):
            digit=k+2;power=[10,100,1000,100000,.1][g-1];num=digit*power+(3 if g<5 else .04);answer=digit*power
            q.update(prompt=f'In {num:g}, what value does the digit {digit} represent?',answer=f'{answer:g}',explanation=f'The digit {digit} has value {answer:g} because of its position.')
    # First-grade multiplication/division, area and perimeter stay concrete rather than formal requirements.
    if g==1 and s['subject']=='Math' and t in ['multiplication','division','area','perimeter','rules']:
        s['standards'][0]['reference']='Grade 1 enrichment / concrete prerequisite exploration'
from curriculum_expansion import expand
expand(add, out)
path=pathlib.Path('content/curriculum/grades-1-5.json');path.write_text(json.dumps(out,indent=2)+'\n')
print(f'Wrote {len(out)} draft skills across all 20 grade/subject combinations.')
