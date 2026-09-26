"""Additional elementary domain tasks; all records remain drafts."""
def expand(add, out):
    for g in range(1,6):
        cases=[]
        for k in range(3):
            names=['triangle','rectangle','pentagon']; sides=[3,4,5]
            if g<=2:p=f'A flat shape has {sides[k]} straight sides. What is its name?';a=names[k];r=f'A {a} has {sides[k]} straight sides.'
            elif g==3:p=f'How many vertices does a {names[k]} have?';a=sides[k];r='Each meeting of two sides forms a vertex.'
            elif g==4:p=f'A quadrilateral has {k+1} pair'+('s' if k else '')+' of parallel sides. Can a quadrilateral have three pairs of parallel sides?';a='no';r='With four sides there can be at most two opposite pairs.';p=['Does every square have four right angles?','Does every rectangle have four equal sides?','Can a quadrilateral have three pairs of opposite parallel sides?'][k];a=['yes','no','no'][k];r=['A square has four equal sides and four right angles.','A rectangle can have different length and width.','Four sides make only two opposite pairs.'][k]
            else:p=['Is every square also a rectangle?','Is every rectangle also a square?','Can a triangle have two right angles?'][k];a=['yes','no','no'][k];r=['Squares meet the definition of rectangles.','Rectangles need not have equal side lengths.','A triangle’s angles total 180 degrees.'][k]
            cases.append((p,a,r,[]))
        add(g,'Math','Geometry','shapes','Shapes and their properties','Classify shapes using sides, corners, angles and shared properties.',cases,terms=['sides','angles','equal','four','three'])
        cases=[]
        for k in range(3):
            a=g*100+k*50;b=50+k*20
            if g==1:p=f'A balance tilts down on the apple side and up on the feather side. Which is heavier: apple or feather?';ans='apple';r='The heavier side goes down on this balance.'
            else:p=f'A bag has mass {a} grams. Another has mass {b} grams. What is their combined mass in grams?';ans=a+b;r=f'Use matching units and add: {a}+{b}={ans} grams.'
            if g==1:p=[p,'A balance is level with one stone on each side. Are their masses equal?','A full bottle has more water than an identical half-full bottle. Which has more mass: full or half-full?'][k];ans=['apple','yes','full'][k];r=['The lower side holds the heavier object.','A level balance indicates equal mass.','The full bottle contains more water and has more mass.'][k]
            cases.append((p,ans,r,[]))
        add(g,'Math','Measurement','mass','Mass and measurement','Compare mass using balances or add measurements in the same unit.',cases,terms=['mass','heavier','equal','grams','unit'])
        if g>=2:
            add(g,'Math','Numbers & Operations','rounding','Rounding and estimating','Use neighbouring benchmark numbers and the midpoint to round.',[(f'Round {n} to the nearest {unit}.',round(n/unit)*unit,f'Locate {n} between neighbouring multiples of {unit}; choose the nearest.',[]) for n,unit in ([(34,10),(67,10),(82,10)] if g==2 else [(237,100),(681,100),(849,100)] if g==3 else [(2419,1000),(8671,1000),(6249,1000)] if g==4 else [(4.27,.1),(6.83,.1),(9.14,.1)])],prereq=[f'g{g}_math_place_value'],terms=['nearest','benchmark','half','place'])
            add(g,'Math','Measurement','conversions','Converting measurement units','Relate a larger unit to equal groups of a smaller unit.',[(f'How many centimetres are in {k+g} metres?',(k+g)*100,f'Each metre has 100 centimetres, so multiply {k+g} by 100.',[]) for k in range(3)],prereq=[f'g{g}_math_length'],terms=['hundred','100','unit','multiply'])
        if g>=3:
            add(g,'Math','Geometry','angles','Angles and turns','Compare angles with a right angle and measure turns.',[(f'Is a {d}-degree angle acute, right, or obtuse?',a,f'{d} degrees is {rel} 90 degrees.',[]) for d,a,rel in [(40,'acute','less than'),(90,'right','equal to'),(130,'obtuse','greater than')]],prereq=[f'g{g}_math_shapes'],terms=['90','right','turn','degrees'])
            add(g,'Math','Geometry','volume','Building and measuring volume','Count cubic units in layers to find volume.',[(f'A box is built from {k+2} layers. Each layer has {g} rows of 2 unit cubes. How many cubes are in the box?',(k+2)*g*2,f'Each layer has {g*2} cubes; multiply by {k+2} layers.',[]) for k in range(3)],prereq=[f'g{g}_math_area'],terms=['cubes','layers','multiply','cubic'])
            add(g,'Math','Fractions','equivalence','Equivalent fraction relationships','Scale both the numerator and denominator to preserve the quantity.',[(f'Complete the missing numerator: 1/{d} = __/{d*2}.',2,f'Splitting each part in two doubles both counts: 1/{d}=2/{d*2}.',[]) for d in [3,4,5]],prereq=[f'g{g}_math_fractions',f'g{g}_math_multiplication'],terms=['both','same','multiply','equal'])
        if g>=4:
            add(g,'Math','Fractions','fraction_operations','Operations on fractions','Use equal-sized parts and then combine the selected parts.',[(f'What is 1/{d} + 2/{d}?',f'3/{d}',f'The unit remains {d}ths; combine the three selected parts.',[]) for d in [4,5,7]],prereq=[f'g{g}_math_equivalence'],terms=['same','denominator','add','parts'])
            add(g,'Math','Numbers & Operations','decimals','Decimals and fraction relationships','Connect tenths and hundredths to decimal notation.',[(f'Write {n}/100 as a decimal.',f'{n/100:.2f}',f'{n} hundredths is {n/100:.2f}.',[]) for n in [25,47,83]],prereq=[f'g{g}_math_place_value'],terms=['hundredths','tenths','place','100'])
        if g==5:
            add(g,'Math','Geometry','coordinates','Reading coordinate pairs','An ordered pair gives horizontal movement first and vertical movement second.',[(f'From the origin, move {k+2} units right and {k+4} up. What is the y-coordinate?',k+4,f'The second coordinate records the upward distance, {k+4}.',[]) for k in range(3)],prereq=['g5_math_data'],terms=['second','vertical','up','coordinate'])
        # Actual reading and writing tasks, with passages stored on the canvas.
        add(g,'English','Reading','compare_texts','Comparing texts','Compare two texts using a detail from each.',[(f'Text A: {a} Text B: {b} {p}',answer,reason,[dict(type='passage',text=f'Text A: {a}\nText B: {b}',highlights=[])]) for a,b,p,answer,reason in [('Jo walks to school.','Lin rides a bus to school.','Do both describe travelling to school?','yes','Both characters travel to school, using different ways.'),('The hill is covered with trees.','The beach has sand and shells.','Which text describes a beach?','Text B','Sand and shells support identifying Text B as the beach.'),('Rain filled the empty pond.','During the drought the pond dried up.','Do the pond levels change in the same direction or opposite directions?','opposite directions','Rain adds water, while drought reduces it.')]],terms=['both','different','detail','text'])
        add(g,'English','Reading','fluency','Reading with phrasing','Use punctuation and meaningful phrases to support reading aloud.',[(p,a,r,[]) for p,a,r in [('Read aloud: After lunch, we went outside. Where does the comma suggest a brief pause?','after lunch','The introductory phrase ends at the comma.'),('In Wait! Stop! do the exclamation marks suggest urgency or boredom?','urgency','The punctuation signals strong emphasis.'),('Read: Are you coming? Is the speaker asking or telling?','asking','The question mark identifies a question.')]],terms=['pause','meaning','punctuation','question'])
        add(g,'English','Vocabulary','word_relationships','Word relationships','Use context to distinguish related words and opposites.',[(p,a,r,[]) for p,a,r in [('Which is an opposite of empty: full or quiet?','full','Full describes the opposite amount from empty.'),('Which means nearly the same as joyful: happy or cold?','happy','Joyful and happy have related meanings.'),('A seedling grows into a tree. Is seedling related to a young plant or a stone?','a young plant','A seedling is an early stage of plant growth.')]],terms=['meaning','opposite','same','related'])
        add(g,'English','Writing','composition','Composing and revising sentences' if g<3 else 'Composing and revising paragraphs','Write a clear claim or topic sentence, support it with a relevant reason, and revise for clarity.',[(p,a,a,[]) for p,a in [('Write '+('one or two sentences' if g<3 else 'a short paragraph')+' explaining why a class garden might help students learn. Include a reason.','A class garden helps students learn because they can observe plants growing.'),('Write an opinion about reading together. Give a reason and a supporting example.','Reading together is helpful because we can discuss a story and explain a confusing word.'),('Revise this unclear explanation by adding a useful reason: We should label the boxes because labels are labels.','We should label the boxes because clear names help people find what they need.')]],terms=['garden','plants','read','story','word','label','boxes','names'])
        out[-1]['rubric']['criteria'][1]['terms']=['because','so that','for example','helps','help']
        for q in out[-1]['questions']:q['responseType']='writing'
    # Misconceptions are hypotheses. Attach a diagnostic wrong answer only when
    # a task has a distinctive alternative; unrelated mistakes never confirm it.
    for skill in out:
        topic=skill['topic'];sid=skill['id'];subject=skill['subject']
        misconception={'id':sid+'_hypothesis','name':'Choosing without checking evidence','wrongAnswer':'guess without checking','verification':'Ask for a detail that supports the claim on a fresh task.','remediation':['guided_questioning','evidence_first']}
        if subject=='Math':
            cases={
              'addition':('Adding digits without place values','What value does each digit have before adding?'),
              'subtraction':('Adding instead of finding the remainder','Compare what arrives with what is taken away.'),
              'place_value':('Digit confused with its value','Compare the same digit in two different positions.'),
              'multiplication':('Adding the group count and size','Build two equal groups; count all the objects.'),
              'division':('Confusing number of groups with group size','Share a fresh total and name both counts.'),
              'fractions':('Reversing selected parts and total parts','Ask which count names the whole on a new diagram.'),
              'area':('Area confused with perimeter','Compare square units covering a shape with boundary units.'),
              'perimeter':('Perimeter confused with area','Trace the boundary before measuring it.'),
              'equivalence':('Scaling only one part','Use a new fraction to check whether both counts scale.'),
              'fraction_operations':('Adding denominators','Ask whether the piece size changes when joining equal parts.'),
              'mass':('Confusing size with mass','Compare two differently sized objects on a balance.'),
              'angles':('Classifying by ray length','Draw the same angle with longer rays.'),
              'volume':('Counting only one layer','Build a second layer and count how the total changes.'),
              'coordinates':('Reversing coordinate order','Ask for horizontal and vertical distance separately.'),
              'rounding':('Always rounding upward','Locate a number closer to the lower benchmark.'),
            }
            name,verification=cases.get(topic,('Applying an operation without checking units','Try a fresh example and explain which unit or operation is needed.'))
            misconception.update(name=name,verification=verification,remediation=['concrete_real_world_example','guided_questioning'])
            import re
            for q in skill['questions']:
                wrong=None;nums=[float(n) for n in re.findall(r'\d+(?:\.\d+)?',q['prompt'])]
                if topic=='subtraction' and len(nums)==2:wrong=str(sum(nums)).removesuffix('.0')
                elif topic=='multiplication' and len(nums)==2:wrong=str(sum(nums)).removesuffix('.0')
                elif topic=='place_value' and nums:wrong=str(nums[-1]).removesuffix('.0')
                elif topic=='fractions' and '/' in q['answer']:wrong='/'.join(q['answer'].split('/')[::-1])
                elif topic=='fraction_operations' and len(nums)==4:wrong=f'{int(nums[0]+nums[2])}/{int(nums[1]+nums[3])}'
                elif topic=='equivalence':wrong='1'
                if wrong and wrong!=q['answer']:
                    q['misconception']={'id':misconception['id'],'answer':wrong};misconception['wrongAnswer']=wrong
        else:
            if subject=='English' and skill['domain']=='Writing':misconception.update(name='Giving a claim without a relevant reason',verification='Ask for a reason that specifically supports the child’s own claim.',remediation=['guided_questioning','partial_worked_example'])
            if subject=='Science':misconception.update(name='Confusing an observation with an explanation',verification='Ask what was observed and what is being inferred, using a new example.',remediation=['diagram_first','guided_questioning'])
        skill['misconceptions']=[misconception]
