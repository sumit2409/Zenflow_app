import React from 'react'
import type { GoalIntent } from '../types/experience'

export type BlogArticleId =
  | 'beat-phone-addiction'
  | 'dopamine-detox-guide'
  | 'deep-work-system'
  | 'focus-tracking'

type BlogArticle = {
  slug: BlogArticleId
  title: string
  description: string
  excerpt: string
  readTime: string
  category: string
  goal: GoalIntent
  imageSrc: string
  imageAlt: string
  imageCaption: string
  kicker: string
  heroStats: Array<{ value: string; label: string }>
  takeaways: string[]
  ctaTitle: string
  ctaBody: string
  ctaPoints: string[]
  bodyHtml: string
}

type BlogPageMeta = {
  title: string
  description: string
}

type AuthHandler = (mode: 'login' | 'register', goal?: GoalIntent) => void

const beatPhoneAddictionBody = `
<h2>The real problem is not your phone. It is the loop.</h2>
<p>Most people describe phone addiction as a discipline problem. That sounds neat, but it misses the mechanism. You do not reach for your phone fifty times a day because you made fifty conscious decisions. You do it because the device has fused itself to tiny moments of discomfort: boredom in a queue, friction before starting work, awkwardness in social settings, fatigue after lunch, stress after a hard email, and that empty mental gap before sleep.</p>
<p>The phone becomes a fast answer to every low-grade unpleasant feeling. That is why generic advice such as "just use less screen time" usually fails. The phone is not only entertainment. It is relief, avoidance, novelty, social reassurance, and an identity machine. If you want to beat phone addiction, you need to break the relief loop, not just reduce the minutes.</p>

<h2>What phone addiction actually looks like</h2>
<p>Forget the dramatic image of someone scrolling all night every night. The more common pattern is quieter. You unlock your phone to check one message and end up on three other apps. You pick it up during work breaks and your brain never properly settles back into focus. You keep YouTube, Instagram, X, Reddit, or short-form video apps around as a background reward system. You feel busy all day but strangely undernourished.</p>
<p>Common signs include checking the phone the second you wake up, feeling phantom vibrations, opening apps without a clear reason, carrying the phone from room to room, and finding silence difficult. Another sign is that simple offline activities start to feel "too slow." Reading a few pages of a book feels harder than flicking through twenty reels. That is not random. Your reward system has been trained to expect speed, novelty, and constant switching.</p>

<h2>Why your brain keeps coming back</h2>
<p>Phones compress a huge number of rewards into one object. Social validation. News. Curiosity. Humor. Desire. Fear. Status. Surprise. The brain learns that this small rectangle might contain something valuable every time you tap it. That uncertainty matters. Intermittent rewards are sticky. A boring check followed by one exciting post or one important message is enough to strengthen the habit.</p>
<p>There is also a cost most people underestimate: attentional residue. Every quick check leaves a trace. Even if the interruption lasts twenty seconds, part of your mind stays behind. You return to your work but you do not fully return. That is why phone addiction can wreck your day without massive raw screen time. Five minutes here and there can still pulverize deep concentration.</p>

<div class="blog-inline-callout">
  <strong>The key shift:</strong> stop thinking only in hours lost. Think in attention quality lost.
</div>

<h2>Start with an audit, not a promise</h2>
<p>People often begin with a dramatic vow: "From tomorrow I will barely use my phone." That almost always collapses because the environment stays the same. A better first move is an audit. For three days, do not try to improve anything. Just observe. Check your screen time dashboard. Note the top five apps. Notice pickup count. Write down the moments when you unlock the phone without a reason.</p>
<p>Look for patterns. Do you scroll after hard work because you feel mentally depleted? Do you check social apps when a task becomes ambiguous? Do you stay up late because night is the only time you feel unstructured and free? These triggers matter more than a moral speech about discipline. Once you see the pattern, you can redesign the system.</p>

<h2>Remove friction from good behavior. Add friction to bad behavior.</h2>
<p>Behavior change is rarely about heroic self-control. It is mostly about friction. If the addictive action is easy and the better action is vague, the addictive action wins. So flip that.</p>
<ul>
  <li>Take social apps off the home screen.</li>
  <li>Log out after each use if the app is especially sticky.</li>
  <li>Turn off every notification that is not from a human you genuinely need to hear from quickly.</li>
  <li>Use grayscale if visuals trigger endless consumption.</li>
  <li>Charge the phone outside the bedroom.</li>
  <li>Keep a book, notebook, or Kindle in the places where you usually doomscroll.</li>
</ul>
<p>These sound small, but small is the point. Habits are path dependent. A minor barrier at the exact moment of impulse is often enough to stop autopilot. If you have to unlock, search, log in, and wait, your conscious mind has time to wake up and ask a better question: "Do I even want this right now?"</p>

<h2>Build a morning that does not begin with surrender</h2>
<p>Your first thirty minutes set the tone for your attentional baseline. If you wake up and immediately flood your mind with notifications, messages, feeds, and other people's priorities, you begin the day reactive. Your brain gets trained to expect stimulation before effort. That makes focused work feel even more painful later.</p>
<p>A better approach is simple: delay the phone. Even twenty to thirty minutes helps. Use that time for water, washing, sunlight, a short walk, stretching, journaling, or planning the day. The goal is not to become a monk. The goal is to prove that you can start the day without external noise. Once that becomes normal, the phone loses part of its psychological authority.</p>

<h2>Replace the reward, do not just delete it</h2>
<p>Many people try to quit scrolling without replacing what scrolling was doing for them. That is a structural mistake. Your phone may be meeting several needs at once: decompression, stimulation, escape, connection, and easy reward. If you remove it, you need substitutes for each category.</p>
<ul>
  <li>For decompression: walking, stretching, breath work, music without feeds attached.</li>
  <li>For stimulation: books, podcasts, learning projects, long-form videos watched deliberately.</li>
  <li>For escape: short intentional breaks, not open-ended app wandering.</li>
  <li>For connection: direct messages, calls, in-person meetings instead of passive social consumption.</li>
  <li>For reward: visible progress in meaningful work.</li>
</ul>
<p>This last one matters. Part of the reason people spiral into phone use is that real life progress often feels delayed. A feed gives instant feedback. Real work gives slower feedback. One way to bridge that gap is to track progress visibly. That is where a tool like <a href="/" class="public-link">Zenflow</a> fits naturally if you want your focus sessions, streaks, and notes in one place. If you can see completed focus sessions, streaks, and time invested, meaningful effort starts generating its own reward signal.</p>

<h2>Create phone rules that are specific enough to survive stress</h2>
<p>Vague rules fail under pressure. "Use the phone less" is too fuzzy. Better rules sound like this:</p>
<ul>
  <li>No social media before 11 AM.</li>
  <li>The phone stays outside the bedroom.</li>
  <li>I check messages at 12 PM, 5 PM, and 8 PM.</li>
  <li>I can use YouTube on desktop for deliberate videos, but not shorts on mobile.</li>
  <li>If I catch myself unlocking without purpose, I put the phone down and stand up.</li>
</ul>
<p>The point is not rigidity for its own sake. It is clarity. In high-friction moments, you do not want to negotiate. You want a pre-made decision.</p>

<h2>How to deal with relapse without making it worse</h2>
<p>Phone addiction has a nasty pattern: slip, then shame, then binge. You break your own rule, feel annoyed, and then think the day is already ruined. So you keep scrolling. That reaction is worse than the original slip. Treat relapses like data. Ask what happened. Were you tired, lonely, overwhelmed, bored, avoiding a difficult task, or simply trapped by environment?</p>
<p>The useful question is never "What is wrong with me?" It is "What made the bad action easy right now?" Then fix that part. Maybe you need a stronger night boundary. Maybe you need to break your work into clearer chunks so that ambiguity does not push you toward escape. Maybe the app needs to be deleted from mobile entirely.</p>

<h2>The deeper win: reclaiming boredom</h2>
<p>One of the best signs of recovery is that boredom stops feeling intolerable. This matters because boredom is often the doorway to better things. It pushes you to think, notice, plan, read, create, and rest. If every tiny gap gets filled by the phone, your mind never gets the chance to idle properly. You lose spontaneous thought. You lose the quiet build-up that often precedes insight.</p>
<p>Beating phone addiction is therefore not just about cutting screen time. It is about rebuilding your capacity to sit with less stimulation and still feel okay. That capacity feeds concentration, creativity, and emotional steadiness.</p>

<h2>A practical 7-day reset</h2>
<ol>
  <li><strong>Day 1:</strong> Audit screen time and identify your top trigger apps.</li>
  <li><strong>Day 2:</strong> Turn off non-essential notifications.</li>
  <li><strong>Day 3:</strong> Move addictive apps off the home screen or delete them from mobile.</li>
  <li><strong>Day 4:</strong> Make the first 30 minutes of the morning phone-free.</li>
  <li><strong>Day 5:</strong> Create one 60-minute phone-free work block.</li>
  <li><strong>Day 6:</strong> Keep the phone out of the bedroom at night.</li>
  <li><strong>Day 7:</strong> Review what actually worked and keep only the changes you can sustain.</li>
</ol>

<h2>Final thought</h2>
<p>Your phone is not stronger than your brain. It is just better optimized than your habits. Once you stop relying on willpower alone and start redesigning the environment, the whole problem becomes less mystical. You do not need to become anti-technology. You need to become intentional. Use the device for what serves you. Cut the parts that quietly feed on your attention. Then put your reclaimed time into something that leaves you stronger at the end of the day, not emptier.</p>
`

const dopamineDetoxBody = `
<h2>Dopamine detox is a useful idea, but it is often explained badly</h2>
<p>Online, dopamine detox is sometimes marketed as if you can flush stimulation out of your brain and become instantly disciplined. That is nonsense. Dopamine is not a toxin. It is a core neurotransmitter involved in motivation, learning, salience, and reward prediction. You do not want less dopamine in general. You want a healthier relationship with stimuli that hijack it.</p>
<p>The practical value of a dopamine detox is not biochemical purity. It is behavioral contrast. When your days are packed with fast rewards such as short-form videos, junk content, endless notifications, hyperpalatable food, and constant app switching, ordinary life starts to feel flat. Reading feels slow. Work feels heavy. Conversation feels under-stimulating. The detox is a way of reducing the noise long enough for your reward system to settle and for lower-intensity activities to feel rewarding again.</p>

<h2>What people usually get wrong</h2>
<p>The first mistake is extremism. They decide to remove everything pleasurable at once. No music, no coffee, no phone, no talking, no entertainment. That approach creates friction so high that most people quit or rebound into a binge. The second mistake is vagueness. They say they want less stimulation but keep the same environment and the same cues. Then they wonder why they reach for the phone at the first uncomfortable moment.</p>
<p>A working dopamine detox is not a punishment. It is a reset protocol. It should reduce unnecessary spikes, protect your attention, and help you rediscover slower rewards. If the plan is too theatrical to survive real life, it is not a plan.</p>

<h2>Why high stimulation makes normal life feel dull</h2>
<p>Your brain adapts to what you repeatedly feed it. If your default day includes constant novelty, algorithmic feeds, tab switching, and immediate entertainment, then effortful tasks face a steep comparison. A spreadsheet cannot compete with a stream of custom-tailored novelty. Neither can a textbook, a research article, or a long coding session. This does not mean your brain is broken. It means your baseline has shifted.</p>
<p>That shift shows up in predictable ways. You procrastinate more. You cannot stay with a difficult thought for long. You feel the urge to "just check something" whenever work gets ambiguous. Even rest becomes corrupted because you no longer know how to rest without stimulation. A good detox helps correct the baseline by removing the biggest spikes first.</p>

<div class="blog-inline-callout">
  <strong>Better definition:</strong> a dopamine detox is a temporary reduction of high-stimulation inputs so that attention, motivation, and enjoyment of normal effort can recover.
</div>

<h2>What to reduce during a realistic detox</h2>
<p>The exact list depends on your habits, but for most people the main targets are obvious:</p>
<ul>
  <li>Short-form video platforms and infinite-scroll social feeds.</li>
  <li>Compulsive checking of messages, news, and email.</li>
  <li>Mindless streaming used as background anesthesia.</li>
  <li>Multi-screen behavior, where one stream of content is layered on top of another.</li>
  <li>Any low-value digital habit that gives fast reward with little real benefit.</li>
</ul>
<p>You do not need to remove every enjoyable thing. You need to remove the things that flatten your capacity for sustained attention.</p>

<h2>What to keep instead</h2>
<p>The goal is not sensory deprivation. The goal is to return to activities whose reward profile is slower but more nourishing. Useful replacements include walking, writing, cleaning, reading, cooking, talking to people, stretching, working on a craft, and doing one thing at a time without an extra stream attached. Notice the pattern: the replacement activities are not passive reward machines. They ask something from you.</p>
<p>This is why the detox often feels uncomfortable at first. You are not only cutting stimulation. You are removing escape routes. That discomfort is not evidence that the process is failing. It is evidence that you are finally feeling the friction that constant stimulation was covering up.</p>

<h2>Choose a format you can actually complete</h2>
<p>You do not need a seven-day cabin retreat. Start with one of these formats:</p>
<ul>
  <li><strong>Low-stimulation morning:</strong> no phone, social media, or entertainment for the first 60 to 90 minutes of the day.</li>
  <li><strong>Workday detox:</strong> no short-form content and no reactive app checking until your main work block is done.</li>
  <li><strong>Weekend reset:</strong> one full day with no infinite-scroll apps and no random checking.</li>
  <li><strong>Evening downshift:</strong> last hour of the day with low light, no feeds, and no emotional stimulation.</li>
</ul>
<p>For most people, repeated low-stimulation windows work better than one dramatic purge. They fit real schedules and retrain behavior gradually.</p>

<h2>How to structure the detox so it does not collapse</h2>
<h3>1. Remove cues</h3>
<p>If the app is still on the home screen, still logged in, and still sending notifications, the cue is alive. You are depending on resistance alone. Delete or hide what you do not need. Log out if that adds useful friction. Disable notification badges. Make bad habits inconvenient.</p>

<h3>2. Pre-decide your allowed activities</h3>
<p>Without clear replacements, the brain looks for the fastest available reward. Write down what is allowed during the detox window: reading, showering, walking, deep work, cleaning, planning, meal prep, gym, or quiet music. Pre-deciding reduces negotiation.</p>

<h3>3. Expect craving spikes</h3>
<p>The urge to check your phone does not mean you need your phone. It usually means your brain wants a fast state change. Learn to label the feeling correctly. "This is an urge, not an instruction." Then do something physical for two minutes. Stand up. Drink water. Walk. The intensity often drops faster than you think.</p>

<h3>4. Track the parts that matter</h3>
<p>A detox works better when it produces visible wins. Measure focus hours, completed tasks, mood, sleep quality, and pickup count. This is one place where <a href="/" class="public-link">Zenflow</a> can quietly help by keeping focus time, tasks, and progress visible without adding much friction. The point is not to gamify your life into absurdity. It is to replace vague effort with feedback.</p>

<h2>What the first few days feel like</h2>
<p>Day one often feels strange rather than glorious. You may notice restlessness, low patience, and repeated impulses to seek novelty. That is normal. Day two or three can feel easier, especially if your environment is clean and your plan is clear. Many people then experience a subtle shift: work starts to feel less aversive, reading becomes more tolerable, and silence stops feeling empty.</p>
<p>Do not expect enlightenment. Expect a reduction in cognitive scatter. That is enough. Once scatter drops, you can build routines on top of it.</p>

<h2>How dopamine detox connects to deep work</h2>
<p>A detox is not the end goal. It is preparation. It reduces the background appetite for novelty so that deep work becomes possible again. Without this step, many people sit down to work and feel instant resistance because their brains are calibrated for rapid switching. After a successful detox window, focus no longer feels like such a steep drop in stimulation. That changes everything.</p>
<p>Use the reclaimed mental bandwidth immediately. If you detox but do nothing meaningful with the recovered attention, the old habits creep back in. Fill the space with one concrete target: writing, coding, studying, planning, or learning a difficult skill.</p>

<h2>A realistic 3-step dopamine detox plan</h2>
<ol>
  <li><strong>Cut the largest spikes first.</strong> Remove short-form video, compulsive social feeds, and non-essential notifications.</li>
  <li><strong>Create daily low-stimulation windows.</strong> Start with the first hour of the morning and one focused work block.</li>
  <li><strong>Track what improves.</strong> Look for better focus, less checking, more patience, and stronger follow-through.</li>
</ol>

<h2>What not to do</h2>
<ul>
  <li>Do not make the detox so strict that it becomes performative.</li>
  <li>Do not keep "just one" highly addictive app accessible during the reset window.</li>
  <li>Do not replace scrolling with a different type of mindless digital consumption and call it a detox.</li>
  <li>Do not expect the plan to work if your sleep is wrecked and your day has no structure.</li>
</ul>
<p>That last point matters. Stimulation habits get worse when you are tired, uncertain, and emotionally depleted. A detox works best when paired with basics: sleep, food, movement, and one clear priority per day.</p>

<h2>The deeper benefit</h2>
<p>Done properly, a dopamine detox gives you something more important than lower screen time. It restores contrast. You start to enjoy things that were always valuable but had been drowned out by artificial intensity: long conversations, a clean desk, a finished task, a quiet walk, a chapter of a book, a strong work session, a calmer evening. Those rewards are slower, but they leave you fuller instead of emptier.</p>
<p>That is why the detox can be powerful. It does not make life smaller. It makes life legible again. It reminds your brain that not every moment needs a spike to matter.</p>

<h2>Final thought</h2>
<p>If the term dopamine detox feels trendy, ignore the label and keep the principle. Reduce the inputs that train your brain to need constant intensity. Protect a few hours of lower stimulation every day. Use those hours for work and recovery that actually compounds. The point is not purity. The point is control.</p>
`
const deepWorkBody = `
<h2>Deep work is not just working hard</h2>
<p>A lot of people say they need to focus more when what they really need is a different work architecture. Deep work is not about trying harder inside a broken system. It is about creating conditions where high-value cognition can actually happen. That means long enough blocks, clear targets, low switching, and deliberate recovery. Without those, you may still feel busy, but you are mostly doing shallow work with occasional bursts of strain.</p>
<p>Shallow work has its place. Emails, admin, logistics, scheduling, quick edits, coordination. The problem starts when shallow work colonizes the whole day. Then your best mental hours are spent reacting instead of building. For knowledge work, that is a bad trade. The tasks that change your trajectory are rarely the easiest ones. They are the ones that require uninterrupted thought: writing a paper, designing a system, debugging a hard problem, building a product, understanding a dense topic, or creating something original.</p>

<h2>Why concentration feels harder than it used to</h2>
<p>Modern work tools are optimized for availability, not depth. Slack, inboxes, chats, tabs, dashboards, meetings, comments, and notifications all assume that your mind should remain interruptible. If you never resist that assumption, your brain gets trained into a permanent state of partial attention. You become fast at checking and slow at thinking.</p>
<p>There is also a deeper issue. Many people have lost tolerance for cognitive friction. The moment a task becomes confusing or demanding, they reach for a faster reward or a simpler task. That looks like procrastination, but often it is just low discomfort tolerance. Deep work requires the opposite response. You meet resistance and stay.</p>

<div class="blog-inline-callout">
  <strong>Core principle:</strong> deep work is the practice of staying with cognitively demanding effort long enough for real progress to happen.
</div>

<h2>The four ingredients of a working deep work system</h2>
<h3>1. A protected block</h3>
<p>Deep work needs time that is defended. Not loosely available. Defended. For most people that means 60 to 120 minutes at minimum. Shorter blocks can work, but only when the setup is excellent and the target is narrow. A block must have a start time, a finish time, and a purpose. Otherwise it degrades into hopeful multitasking.</p>

<h3>2. A single target</h3>
<p>"Work on project" is too vague. The brain resists ambiguity. Define the session as an observable target: draft 700 words, implement one function, solve one subsection, annotate one paper, create one slide sequence, revise one figure. Clarity cuts startup friction.</p>

<h3>3. A distraction protocol</h3>
<p>Do not rely on a promise that you will ignore interruptions. Design the environment so interruptions struggle to reach you. Silence the phone. Close tabs. Shut down chat apps if possible. Put the device out of sight. Keep only the tools required for the session. If a distracting thought appears, write it on scrap paper and continue.</p>

<h3>4. A recovery pattern</h3>
<p>Deep work is metabolically expensive. If you stack demanding sessions without recovery, quality falls. The answer is not endless grind. It is rhythmic intensity. Work deeply, then stop. Take a short walk. Stretch. Eat. Let the mind reset. The best systems alternate pressure and release.</p>

<h2>How to build deep work into a normal day</h2>
<p>You do not need an academic sabbatical. Start by identifying your cognitive prime time. For some people that is early morning. For others it is late morning or evening. Put your hardest work there. Do not waste your best mental window on inbox maintenance.</p>
<p>Then create tiers. One or two deep work blocks for hard problems. One medium-focus block for lighter production. One shallow block for admin. This reduces decision fatigue because not every hour is trying to do everything.</p>

<h2>A practical weekly structure</h2>
<ul>
  <li><strong>Monday:</strong> plan the week, define the high-value tasks, block deep sessions on the calendar.</li>
  <li><strong>Tuesday to Thursday:</strong> protect the main production blocks before reactive work expands.</li>
  <li><strong>Friday:</strong> lighter deep work, review outputs, clean loose ends, decide the next week's first target.</li>
</ul>
<p>This sounds ordinary because it is. The power is not in novelty. It is in consistency.</p>

<h2>What to do when you cannot focus</h2>
<p>Most people make the same mistake. They interpret difficulty focusing as proof they should switch tasks. Sometimes that is true, but often it is exactly backward. The first ten to twenty minutes of deep work can feel jagged because the mind is detoxing from fragmentation. Stay longer. Give the task enough runway. Many sessions only become good after a period of awkwardness.</p>
<p>If focus still fails, diagnose the failure correctly. There are usually four causes:</p>
<ul>
  <li><strong>Ambiguity:</strong> the task is not concrete enough.</li>
  <li><strong>Fear:</strong> the task threatens your ego because success and failure both matter.</li>
  <li><strong>Fatigue:</strong> your energy is too low for hard cognition.</li>
  <li><strong>Overstimulation:</strong> your brain is still craving novelty from other inputs.</li>
</ul>
<p>Each cause has a different fix. Ambiguity needs a smaller next step. Fear needs a tiny entry action. Fatigue needs recovery. Overstimulation needs cleaner inputs and fewer devices. Do not treat all distraction as the same problem.</p>

<h2>Deep work and digital hygiene</h2>
<p>Deep work is much easier when you stop feeding the opposite habit. If your day begins with social feeds and random checking, your brain enters work already scattered. That is why deep work and digital restraint belong together. Protecting your attention outside work improves your attention inside work.</p>
<p>A practical approach is to create a short pre-work ritual. Clear desk. Water. Timer. One sentence describing the session target. Phone away. Tabs closed. Start. The ritual matters because it reduces transition cost. It tells your brain that this mode is different from ordinary browsing.</p>

<h2>Tracking what matters</h2>
<p>Many people track tasks but not depth. That is a mistake. Tasks can hide low-quality effort. What matters is not only what you finished, but how much uninterrupted cognition you invested. A simple metric solves this: count deep work sessions and total deep hours per week.</p>
<p>You can do this on paper, in a spreadsheet, or in a dedicated tool. If you want one place to do that, <a href="/" class="public-link">Zenflow</a> lets you track sessions, plan blocks, and see whether your calendar reflects your priorities. The value is not the app itself. The value is feedback. When deep hours are visible, excuses become harder to hide behind.</p>

<h2>How long should a session be?</h2>
<p>There is no universal number, but most people do well with 60 to 90 minutes at first. Longer is not automatically better. If quality collapses after 70 minutes, a 120-minute block is just a longer performance of fatigue. Build capacity gradually. Two good 75-minute blocks beat one sloppy three-hour stretch.</p>
<p>Also, match block length to task type. Generative work often benefits from longer immersion. Technical review or revision may work well in shorter intervals. The system should serve the work, not the other way around.</p>

<h2>The emotional side of deep work</h2>
<p>Deep work is not only a time-management technique. It is a confrontation with yourself. When you remove distraction, you also remove anesthesia. You see confusion more clearly. You feel resistance more directly. That is why some people unconsciously avoid deep work even when they know it matters. The task is not merely hard. It asks for full contact with uncertainty.</p>
<p>This is also why deep work is so valuable. It compounds skill and self-trust. Every time you stay with a hard task instead of escaping, you reinforce a useful identity: I can think through difficult things without fleeing. That identity matters more than any single productivity trick.</p>

<h2>A simple deep work template</h2>
<ol>
  <li>Choose one high-value task the day before.</li>
  <li>Define the session outcome in one sentence.</li>
  <li>Block 75 minutes.</li>
  <li>Remove phone, notifications, and unrelated tabs.</li>
  <li>Work until the timer ends, logging distractions on paper instead of following them.</li>
  <li>Take a real break.</li>
  <li>Review what moved and schedule the next block.</li>
</ol>

<h2>Final thought</h2>
<p>The people who create rare value are not always more talented. Often they are simply better at protecting uninterrupted thought. In a distracted environment, depth becomes a competitive advantage. More importantly, it becomes a sanity advantage. It feels better to end a day having built something that mattered than to end it buried under fragments. A deep work system gives your best attention somewhere worthy to go.</p>
`

const focusTrackingBody = `
<h2>What gets tracked tends to get shaped</h2>
<p>People often say they want better focus, but the way they assess focus is almost entirely emotional. "I think I worked okay today." "I felt distracted." "This week was rough." Those impressions are not useless, but they are poor instruments. They blur effort, output, mood, and memory. Focus tracking fixes that by turning attention into something visible enough to inspect.</p>
<p>Once you start tracking, patterns appear quickly. You may discover that your best work happens before noon, that context switching destroys your afternoons, that certain apps hollow out your evenings, or that you are doing more reactive work than real progress work. Without data, these are guesses. With data, they become design material.</p>

<h2>Why most people track the wrong things</h2>
<p>Traditional productivity systems often obsess over to-do lists. Tasks matter, but tasks alone can mislead. Two people can both tick off six tasks while one spent the day in fragmented chaos and the other had three clean focus blocks. If you only track completion, you cannot tell the difference. That matters because sustainable productivity depends on the quality of attention, not just the count of outputs.</p>
<p>The best focus tracking systems therefore include both process and outcome. Process answers: how long did I sustain meaningful attention? Outcome answers: what moved because of that attention? One without the other gives a distorted picture.</p>

<div class="blog-inline-callout">
  <strong>Useful rule:</strong> track enough to make better decisions, not so much that tracking becomes the work.
</div>

<h2>The core metrics worth tracking</h2>
<h3>1. Number of focus sessions</h3>
<p>This is the simplest useful metric. A focus session is a block of uninterrupted work on a defined task. Counting sessions helps more than counting vague hours because it reflects intentional starts.</p>

<h3>2. Total focused time</h3>
<p>Hours still matter, but only when the definition is clean. Do not count time when you are half-working and half-checking messages. Focused time should mean a block where the main task held your attention.</p>

<h3>3. Project allocation</h3>
<p>Where did the time go? This matters because many people discover that the work they claim is important gets very little actual attention. Tracking by project reveals misalignment between values and behavior.</p>

<h3>4. Interruption count</h3>
<p>How many times did you break the session for your phone, inbox, chat, or random tabs? This metric is brutally honest. It also helps diagnose whether the issue is environment, impulse control, or poor task definition.</p>

<h3>5. Energy and mood notes</h3>
<p>A short note next to each session can be powerful: high energy, low energy, anxious, clear, sleepy, resistant, sharp. Over time you see how sleep, food, exercise, and timing affect focus quality.</p>

<h2>How to track focus without becoming obsessive</h2>
<p>The danger of tracking is overengineering. If your system needs twelve categories, color codes, and a ten-minute ritual after every block, you will eventually abandon it. Good tracking should be fast. Start and stop a timer. Tag the project. Mark whether the session was solid, mixed, or poor. Add one note if needed. That is enough for most people.</p>
<p>You can do this with paper, a basic spreadsheet, or a platform that already combines timers and logs. If you want a lighter way to do that, <a href="/" class="public-link">Zenflow</a> combines tracking, planning, and habit review in one place. Again, the principle matters more than the software: make focused effort easy to record and easy to review.</p>

<h2>What focus data can reveal</h2>
<p>After a week or two, a good tracking system starts exposing useful truths:</p>
<ul>
  <li>You may have fewer deep work hours than you assumed.</li>
  <li>Your "busy" days may correlate with poor focus rather than good output.</li>
  <li>Your best sessions might cluster at a specific time of day.</li>
  <li>Certain apps or environments may consistently precede bad sessions.</li>
  <li>Long sessions may not be better than shorter clean ones.</li>
</ul>
<p>That is where the value compounds. Tracking is not there to produce pretty dashboards. It is there to inform better design choices.</p>

<h2>The feedback loop that actually improves focus</h2>
<p>A useful focus system runs on a short loop:</p>
<ol>
  <li><strong>Measure.</strong> Capture the session.</li>
  <li><strong>Review.</strong> Notice the pattern.</li>
  <li><strong>Adjust.</strong> Change one variable.</li>
  <li><strong>Repeat.</strong> Test whether the change helped.</li>
</ol>
<p>For example, suppose your afternoon sessions keep collapsing. Instead of concluding that you lack discipline, you test one change: move your hardest task earlier. Or shorten the block. Or remove lunch-time scrolling that floods the brain with novelty. The next week's data tells you whether the intervention worked.</p>

<h2>Tracking focus versus tracking output</h2>
<p>Some people object that tracking focus is indirect because output is what really matters. They are half right. Output matters. But output on complex work is often lagging. A researcher may spend several sessions understanding a problem before producing a visible result. A developer may burn time isolating the real bug. A writer may discard pages before the piece starts working. If you track only visible output, you risk misreading essential thinking time as failure.</p>
<p>Focus tracking protects the process on tasks where the path to output is nonlinear. It gives credit to the right kind of effort, not just the most cosmetically obvious effort.</p>

<h2>How to make the data honest</h2>
<p>Your tracking system is only useful if your definitions are strict enough. A few rules help:</p>
<ul>
  <li>A focus session must have one clear primary task.</li>
  <li>Checking messages or feeds breaks the session unless it is part of the task.</li>
  <li>Background entertainment does not count as focused work.</li>
  <li>Session notes should be factual, not self-punishing.</li>
</ul>
<p>Honesty matters more than elegance. The goal is to understand your attention, not flatter yourself.</p>

<h2>What a simple daily review looks like</h2>
<p>At the end of the day, spend three minutes reviewing:</p>
<ul>
  <li>How many real focus sessions happened?</li>
  <li>What project got the best attention?</li>
  <li>What interrupted you most?</li>
  <li>When did focus feel easiest?</li>
  <li>What one change should tomorrow test?</li>
</ul>
<p>This tiny review turns raw logs into adaptation. Without review, tracking becomes passive collection. With review, it becomes a learning system.</p>

<h2>Weekly review matters even more</h2>
<p>Daily reviews help you adjust tactically. Weekly reviews help strategically. Look at total deep hours, session quality, project allocation, and interruption patterns. Did your week reflect what you say matters? If not, why not? Were you overcommitted, under-rested, too reactive, or simply not specific enough about priorities?</p>
<p>This is where people often confront an uncomfortable truth: lack of progress is frequently not a motivation problem but an allocation problem. They gave their best hours away to noise and expected serious work to happen in scraps. Focus tracking makes that visible.</p>

<h2>Focus tracking for recovery, not just productivity</h2>
<p>A good tracking system also tells you when to stop. If session quality keeps dropping, interruptions rise, and notes show fatigue, the answer may not be "push harder." It may be sleep, movement, food, a walk, or a lighter block. The point is not endless extraction from your brain. The point is intelligent management of a limited resource.</p>
<p>This is one reason tracking can reduce guilt. Instead of vaguely feeling lazy, you can see whether you were actually depleted, fragmented, or misallocated. Better diagnosis leads to better action.</p>

<h2>A beginner-friendly focus tracking setup</h2>
<ol>
  <li>Define one focus session as 45 to 90 minutes on one task.</li>
  <li>Use a timer.</li>
  <li>At the end of each session, log the project, duration, and a quality score: good, mixed, or poor.</li>
  <li>Add one short note on distractions or energy.</li>
  <li>Review daily in three minutes and weekly in ten.</li>
</ol>
<p>That is enough to start. You can always add detail later, but most people benefit more from consistency than complexity.</p>

<h2>Final thought</h2>
<p>Focus feels mysterious when it remains unobserved. Once you track it, it becomes something you can shape. Not perfectly, not mechanically, but reliably enough to improve. That is the real promise of focus tracking. It turns attention from a vague hope into a trainable system. And when attention becomes trainable, so does meaningful progress.</p>
`

const articles: BlogArticle[] = [
  {
    slug: 'beat-phone-addiction',
    title: 'How to Beat Phone Addiction Without Quitting Technology',
    description:
      'A realistic guide to reducing compulsive phone use, rebuilding attention, and making your device serve your goals instead of hijacking them.',
    excerpt:
      'A realistic guide to reducing compulsive phone use, rebuilding attention, and making your device serve your goals instead of hijacking them.',
    readTime: '9 min read',
    category: 'Digital habits',
    goal: 'focus',
    imageSrc: 'https://commons.wikimedia.org/wiki/Special:FilePath/Her%20%2845510549291%29.jpg',
    imageAlt: 'Person looking at a smartphone at night, illustrating compulsive phone use',
    imageCaption: 'Image: "Her (45510549291).jpg" from Wikimedia Commons · License: CC BY 2.0',
    kicker: 'Phone habits',
    heroStats: [
      { value: '7', label: 'day reset to test' },
      { value: '30m', label: 'phone-free morning buffer' },
      { value: '1', label: 'clear rule for each trigger' },
    ],
    takeaways: [
      'Break the relief loop instead of only counting screen time.',
      'Add friction to the apps you check automatically.',
      'Replace scrolling with a visible next step and a short focus block.',
    ],
    ctaTitle: 'Make the reset easier to keep',
    ctaBody:
      'If this article clicks, Zenflow gives you a clean place to run focus sessions, keep short notes, and see your progress without turning self-improvement into a production.',
    ctaPoints: [
      'Use the focus timer when you feel the urge to drift',
      'Keep one daily note for the rule you are testing',
      'See your sessions and streaks in one calm dashboard',
    ],
    bodyHtml: beatPhoneAddictionBody,
  },
  {
    slug: 'dopamine-detox-guide',
    title: 'A Realistic Dopamine Detox Guide That Actually Works',
    description:
      'A grounded dopamine detox guide focused on reducing overstimulation, restoring attention, and making normal work feel engaging again.',
    excerpt:
      'A grounded dopamine detox guide focused on reducing overstimulation, restoring attention, and making normal work feel engaging again.',
    readTime: '8 min read',
    category: 'Reset',
    goal: 'calm',
    imageSrc: 'https://commons.wikimedia.org/wiki/Special:FilePath/Minimalistic_workspace_with_tablet.jpg',
    imageAlt: 'Minimalist workspace with tablet, keyboard, and desk setup representing low-stimulation focus',
    imageCaption: 'Image: "Minimalistic workspace with tablet.jpg" from Wikimedia Commons · License: CC0 1.0',
    kicker: 'Dopamine detox',
    heroStats: [
      { value: '3', label: 'simple reset formats' },
      { value: '1h', label: 'strong first low-stimulation window' },
      { value: '4', label: 'high-noise triggers to cut first' },
    ],
    takeaways: [
      'A detox is a reset protocol, not a punishment ritual.',
      'Remove the biggest stimulation spikes before you add rules.',
      'Use the calmer baseline for real work and recovery quickly.',
    ],
    ctaTitle: 'Turn a reset into a routine',
    ctaBody:
      'Zenflow fits best after the detox idea makes sense: one place for a quiet note, a short meditation, a focus block, and a simple progress trail that helps the habit stick.',
    ctaPoints: [
      'Plan your detox window before it starts',
      'Run a quiet work block without switching tabs',
      'Review what improved while the reset is still fresh',
    ],
    bodyHtml: dopamineDetoxBody,
  },
  {
    slug: 'deep-work-system',
    title: 'A Deep Work System for People Who Get Distracted Easily',
    description:
      'A practical deep work framework for protecting attention, structuring focus blocks, and producing high-value work consistently.',
    excerpt:
      'A practical deep work framework for protecting attention, structuring focus blocks, and producing high-value work consistently.',
    readTime: '9 min read',
    category: 'Deep work',
    goal: 'consistency',
    imageSrc: 'https://commons.wikimedia.org/wiki/Special:FilePath/Laptop_on_a_desk.jpg',
    imageAlt: 'Laptop on a desk representing focused knowledge work',
    imageCaption: 'Image: "Laptop on a desk.jpg" from Wikimedia Commons · License: CC0 1.0',
    kicker: 'Deep work',
    heroStats: [
      { value: '75m', label: 'starter block to protect' },
      { value: '4', label: 'core ingredients' },
      { value: '1', label: 'clear session target' },
    ],
    takeaways: [
      'Deep work needs defended time, not spare time.',
      'Clarity reduces startup resistance more than motivation speeches do.',
      'Tracking deep hours makes shallow drift harder to hide from yourself.',
    ],
    ctaTitle: 'Put the system on rails',
    ctaBody:
      'Zenflow is useful here when you want the ritual to feel easy: plan the block, run the timer, log the session, and leave yourself a breadcrumb for tomorrow without juggling tabs.',
    ctaPoints: [
      'Plan one high-value block before reactive work starts',
      'Track deep sessions separately from shallow admin work',
      'Review what moved before you end the day',
    ],
    bodyHtml: deepWorkBody,
  },
  {
    slug: 'focus-tracking',
    title: 'Focus Tracking: How to Measure Attention and Improve It',
    description:
      'A practical guide to focus tracking, including what metrics matter, how to log sessions, and how to use data to improve concentration.',
    excerpt:
      'A practical guide to focus tracking, including what metrics matter, how to log sessions, and how to use data to improve concentration.',
    readTime: '8 min read',
    category: 'Tracking',
    goal: 'focus',
    imageSrc: 'https://commons.wikimedia.org/wiki/Special:FilePath/Binfire_Dashboard.jpg',
    imageAlt: 'Productivity dashboard representing focus tracking and project visibility',
    imageCaption: 'Image: "Binfire Dashboard.jpg" from Wikimedia Commons · License: CC BY-SA 4.0',
    kicker: 'Focus tracking',
    heroStats: [
      { value: '5', label: 'metrics worth logging' },
      { value: '3m', label: 'daily review window' },
      { value: '1', label: 'change to test next' },
    ],
    takeaways: [
      'Track both the process of attention and the outcomes it creates.',
      'Keep the system light enough that logging does not become avoidance.',
      'Use reviews to test one change at a time instead of guessing.',
    ],
    ctaTitle: 'Keep the data useful, not noisy',
    ctaBody:
      'Zenflow works best here as a low-friction layer: timer, note, planner, and review loop together, so the tracking helps you act instead of just producing more numbers.',
    ctaPoints: [
      'Log real focus sessions quickly',
      'Tie your blocks to the work that matters most',
      'Use weekly review to adjust without overthinking',
    ],
    bodyHtml: focusTrackingBody,
  },
]

export const blogArticleIds = articles.map((article) => article.slug) as BlogArticleId[]

export const blogPageMeta: Record<'blog' | BlogArticleId, BlogPageMeta> = {
  blog: {
    title: 'Blog',
    description: 'Read Zenflow guides on phone habits, dopamine detox, deep work, and focus tracking before you create an account.',
  },
  'beat-phone-addiction': {
    title: articles[0].title,
    description: articles[0].description,
  },
  'dopamine-detox-guide': {
    title: articles[1].title,
    description: articles[1].description,
  },
  'deep-work-system': {
    title: articles[2].title,
    description: articles[2].description,
  },
  'focus-tracking': {
    title: articles[3].title,
    description: articles[3].description,
  },
}

export function isBlogArticleId(value: string): value is BlogArticleId {
  return blogArticleIds.includes(value as BlogArticleId)
}

export function getBlogArticle(slug: BlogArticleId) {
  return articles.find((article) => article.slug === slug) || articles[0]
}

function BlogCard({
  article,
  onOpenArticle,
}: {
  article: BlogArticle
  onOpenArticle: (slug: BlogArticleId) => void
}) {
  return (
    <article className="blog-card card">
      <div className="blog-card-media">
        <img src={article.imageSrc} alt={article.imageAlt} loading="lazy" />
      </div>
      <div className="blog-card-body">
        <div className="blog-card-meta">
          <span>{article.category}</span>
          <span>{article.readTime}</span>
        </div>
        <h3>{article.title}</h3>
        <p>{article.excerpt}</p>
        <div className="plan-tags blog-card-tags">
          {article.takeaways.slice(0, 2).map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
        <button type="button" className="primary-cta" onClick={() => onOpenArticle(article.slug)}>
          Read article
        </button>
      </div>
    </article>
  )
}

export function BlogPreviewSection({
  onOpenIndex,
  onOpenArticle,
}: {
  onOpenIndex: () => void
  onOpenArticle: (slug: BlogArticleId) => void
}) {
  return (
    <section id="blog-preview" className="blog-preview-shell fade-rise">
      <div className="section-heading-block">
        <div className="section-kicker">Blog</div>
        <h2>Read the long-form guides before you ever sign in.</h2>
        <p className="lead">
          These articles are now based on your actual blog drafts. They stay public, fit the Zenflow look, and casually point readers toward the tools only where it feels useful.
        </p>
      </div>
      <div className="blog-preview-grid">
        {articles.map((article) => (
          <BlogCard key={article.slug} article={article} onOpenArticle={onOpenArticle} />
        ))}
      </div>
      <div className="blog-preview-actions">
        <button type="button" className="primary-cta" onClick={onOpenIndex}>
          Browse all articles
        </button>
      </div>
    </section>
  )
}

export function BlogIndexPage({
  onOpenArticle,
  onOpenAuth,
}: {
  onOpenArticle: (slug: BlogArticleId) => void
  onOpenAuth: AuthHandler
}) {
  return (
    <section className="blog-shell">
      <article className="blog-hero-card legal-card">
        <div className="section-kicker">Zenflow Blog</div>
        <h2>Practical articles for people trying to think more clearly and drift less.</h2>
        <p>
          The blog now uses your full article drafts. Readers can work through the ideas first, then use Zenflow later if they want a cleaner timer, note, planner, and progress loop around the habit.
        </p>
        <div className="blog-index-actions">
          <button type="button" className="primary-cta" onClick={() => onOpenAuth('register', 'focus')}>
            Create free account
          </button>
          <button type="button" className="ghost-btn" onClick={() => onOpenAuth('login', 'focus')}>
            Login
          </button>
        </div>
      </article>
      <div className="blog-index-grid">
        {articles.map((article) => (
          <BlogCard key={article.slug} article={article} onOpenArticle={onOpenArticle} />
        ))}
      </div>
    </section>
  )
}

export function BlogArticlePage({
  articleId,
  onOpenIndex,
  onOpenArticle,
  onOpenAuth,
}: {
  articleId: BlogArticleId
  onOpenIndex: () => void
  onOpenArticle: (slug: BlogArticleId) => void
  onOpenAuth: AuthHandler
}) {
  const article = getBlogArticle(articleId)
  const related = articles.filter((entry) => entry.slug !== articleId).slice(0, 3)

  return (
    <section className="blog-shell">
      <article className="blog-article-hero legal-card">
        <div className="blog-article-copy">
          <div className="section-kicker">{article.kicker}</div>
          <h2>{article.title}</h2>
          <p className="blog-article-description">{article.description}</p>
          <div className="blog-hero-meta">
            <span>{article.category}</span>
            <span>{article.readTime}</span>
          </div>
          <div className="blog-stat-grid">
            {article.heroStats.map((item) => (
              <div key={item.label}>
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
        <figure className="blog-article-figure">
          <img src={article.imageSrc} alt={article.imageAlt} />
          <figcaption>{article.imageCaption}</figcaption>
        </figure>
      </article>

      <div className="blog-content-grid">
        <article className="legal-card blog-story-card">
          <div className="blog-takeaway-card">
            <strong>Key takeaways</strong>
            <ul>
              {article.takeaways.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="blog-rich-copy" dangerouslySetInnerHTML={{ __html: article.bodyHtml }} />
        </article>

        <aside className="blog-sidebar">
          <div className="legal-card blog-sidebar-card">
            <div className="section-kicker">Use Zenflow</div>
            <h3>{article.ctaTitle}</h3>
            <p>{article.ctaBody}</p>
            <ul>
              {article.ctaPoints.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <div className="blog-sidebar-actions">
              <button type="button" className="primary-cta" onClick={() => onOpenAuth('register', article.goal)}>
                Start free
              </button>
              <button type="button" className="ghost-btn" onClick={() => onOpenAuth('login', article.goal)}>
                I already have an account
              </button>
            </div>
          </div>

          <div className="legal-card blog-sidebar-card">
            <div className="section-kicker">More reading</div>
            <h3>Keep going</h3>
            <div className="blog-related-list">
              {related.map((entry) => (
                <button key={entry.slug} type="button" className="blog-related-link" onClick={() => onOpenArticle(entry.slug)}>
                  <strong>{entry.title}</strong>
                  <span>{entry.readTime}</span>
                </button>
              ))}
            </div>
            <button type="button" className="ghost-btn" onClick={onOpenIndex}>
              All articles
            </button>
          </div>
        </aside>
      </div>
    </section>
  )
}
