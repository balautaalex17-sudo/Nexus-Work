import type { Exam, Exercise, PartId } from "@/lib/exercises/types";

const readingPart5Fallbacks = [
  {
    title: "The Cartographer's Room",
    topic: "memory",
    text: [
      "Mara had not meant to keep the key. It had been pressed into her palm at the end of the funeral by a cousin who, having spent the afternoon arranging chairs and pouring tea, seemed to believe that every loose object in the house required an immediate custodian. The key was small, brass, and faintly green at the teeth. For three weeks it lay in the saucer by her front door, acquiring the status of an accusation.",
      "The room it opened was at the back of her uncle's shop, behind the cabinets of coastal charts and discontinued railway atlases. Customers had never been allowed there. When Mara finally turned the lock, she expected dust, perhaps a few unsold maps, perhaps the smell of damp paper. Instead she found a long table under a skylight, and on it a map of the town drawn not as it was, but as people had described it to her uncle over forty years. The grocer's corner was oversized; the hospital appeared twice; a lane demolished in 1987 ran confidently through three later streets. In one margin he had written, in his disciplined hand, places become larger when grief uses them often.",
      "Mara's uncle had always called himself a cartographer, though the title had seemed theatrical in an age when phones could announce the shortest route to anywhere. Yet his private map made clear that accuracy had never been his only ambition. He had been collecting the town's emotional distortions: the shortcuts people trusted, the squares they avoided after quarrels, the houses remembered by smells rather than numbers. The result was useless for navigation and strangely exact. Looking at it, Mara recognised how little of a place is made from streets.",
      "At first she told herself she would catalogue the room and sell the shop. Then visitors began arriving with amendments. A retired teacher insisted that the bridge should be wider because every child who crossed it on the first day of school felt it was a continent. A mechanic asked her to remove a garage that had closed only the previous spring; he said its owner had been too kind to become a landmark. Mara listened, pencil in hand, surprised by the authority with which people corrected their own memories.",
      "By winter she understood why her uncle had left no instructions. The map could not be finished, and perhaps that had been its courtesy. A completed town would have been a verdict. An unfinished one remained a conversation, and for the first time since the funeral Mara felt that inheritance was not the same as possession. She locked the room each evening, but less carefully than before.",
    ].join("\n\n"),
    questions: [
      {
        id: "q1",
        prompt: "What does the key initially represent to Mara?",
        options: [
          "A practical solution to a family dispute.",
          "An unwanted responsibility she has avoided facing.",
          "A sentimental object she is eager to preserve.",
          "Evidence of her uncle's professional secrecy.",
        ],
        correctAnswer: "An unwanted responsibility she has avoided facing.",
      },
      {
        id: "q2",
        prompt: "What is unusual about the map Mara finds?",
        options: [
          "It records the town according to personal experience rather than physical scale.",
          "It corrects errors in the official maps sold in the shop.",
          "It combines several towns her uncle had visited during his career.",
          "It predicts how the town might be rebuilt in future decades.",
        ],
        correctAnswer:
          "It records the town according to personal experience rather than physical scale.",
      },
      {
        id: "q3",
        prompt: "The phrase 'strangely exact' suggests that the map is",
        options: [
          "technically impressive despite being difficult to read.",
          "emotionally truthful despite being geographically inaccurate.",
          "valuable because it reveals forgotten legal boundaries.",
          "confusing because it mixes old and new street names.",
        ],
        correctAnswer: "emotionally truthful despite being geographically inaccurate.",
      },
      {
        id: "q4",
        prompt: "What do the visitors' requested changes show?",
        options: [
          "They are trying to protect the commercial value of the shop.",
          "They trust Mara more than they trusted her uncle.",
          "They regard memory as something that can be publicly negotiated.",
          "They want the town to be represented in a more flattering way.",
        ],
        correctAnswer: "They regard memory as something that can be publicly negotiated.",
      },
      {
        id: "q5",
        prompt: "Why does Mara decide the map should remain unfinished?",
        options: [
          "Finishing it would turn a living exchange into something fixed.",
          "She lacks the specialist training required to complete it.",
          "The town is changing too quickly for any map to stay accurate.",
          "Her uncle deliberately hid the information needed to complete it.",
        ],
        correctAnswer: "Finishing it would turn a living exchange into something fixed.",
      },
      {
        id: "q6",
        prompt: "How does Mara's attitude change by the end of the passage?",
        options: [
          "She becomes determined to restore her uncle's reputation.",
          "She accepts the shop as a burden she must endure.",
          "She begins to see the inheritance as an active relationship.",
          "She resolves to preserve the room exactly as she found it.",
        ],
        correctAnswer: "She begins to see the inheritance as an active relationship.",
      },
    ],
  },
  {
    title: "The Theatre Below Ground",
    topic: "urban history",
    text: [
      "Nobody in the council archive had expected the theatre to be there. The redevelopment survey had promised only pipework, rubble and the usual archaeology of neglect: cracked tiles, bottle glass, the sediment of a city repeatedly improved by people in a hurry. Yet beneath the bus station, under a concrete ramp poured in 1962, the contractors uncovered a row of velvet seats facing a stage no wider than a dining table.",
      "The discovery was at once charming and inconvenient. Helena Voss, whose department had spent two years defending the new transport plan, was sent down with a clipboard and a hard hat to determine whether the room possessed enough historical importance to delay the work. She disliked that phrase, historical importance. It sounded measurable, as if the past arrived with labels already attached and merely awaited bureaucratic recognition.",
      "The theatre had operated for nine months in 1908, if the newspaper fragments were to be believed. Its audiences were clerks, tram conductors, seamstresses and apprentices who paid a penny to watch comic monologues after work. Nothing celebrated had happened there. No famous actor had performed beneath its soot-darkened ceiling; no manifesto had been delivered from its little stage. Helena knew this should make the decision easier. Instead it made the place harder to dismiss.",
      "What unsettled her was the intimacy of the evidence. A programme had been folded around a lock of hair. Someone had scratched three initials into the arm of seat twelve and then, perhaps years later, scratched one of them out. Behind the stage lay a chipped mug, a boot button and a list of jokes written in a hand so cramped it seemed to be saving paper at the expense of dignity. The theatre had not changed history, but it had held people briefly outside the machinery of their days.",
      "By evening Helena had drafted two reports. The first was concise, practical and defensible: the room should be photographed, recorded and removed. The second, which she did not send, argued that cities become brutal when they preserve only what can be made grand. She sat on the edge of the stage while traffic moved above her like weather, and understood that her difficulty was not professional uncertainty but recognition. The theatre mattered because almost nothing important had happened there, except ordinary people had wanted, after work and before sleep, to be amused.",
    ].join("\n\n"),
    questions: [
      {
        id: "q1",
        prompt: "Why is the theatre's discovery problematic for the council?",
        options: [
          "It exposes corruption in an earlier redevelopment project.",
          "It may interfere with an already defended transport scheme.",
          "It proves that the archive records have been deliberately altered.",
          "It requires immediate restoration before experts can inspect it.",
        ],
        correctAnswer: "It may interfere with an already defended transport scheme.",
      },
      {
        id: "q2",
        prompt: "What does Helena dislike about the phrase 'historical importance'?",
        options: [
          "It implies that significance can be judged too neatly.",
          "It is normally used by people without historical training.",
          "It encourages the public to romanticise damaged buildings.",
          "It prevents officials from making quick practical decisions.",
        ],
        correctAnswer: "It implies that significance can be judged too neatly.",
      },
      {
        id: "q3",
        prompt: "What makes the theatre difficult for Helena to dismiss?",
        options: [
          "Its connection with a famous performer has been overlooked.",
          "Its architecture is more elaborate than the survey suggested.",
          "Its ordinary use gives it a quiet human force.",
          "Its discovery is likely to make her department unpopular.",
        ],
        correctAnswer: "Its ordinary use gives it a quiet human force.",
      },
      {
        id: "q4",
        prompt: "The examples of objects found in the theatre mainly serve to",
        options: [
          "show that the site was abandoned in haste.",
          "suggest the personal lives of its former users.",
          "prove that performances continued longer than records state.",
          "demonstrate that the building was badly maintained.",
        ],
        correctAnswer: "suggest the personal lives of its former users.",
      },
      {
        id: "q5",
        prompt: "What contrast is created by Helena's two reports?",
        options: [
          "Public enthusiasm versus private indifference.",
          "Legal duty versus financial ambition.",
          "Professional pragmatism versus moral hesitation.",
          "Historical certainty versus factual confusion.",
        ],
        correctAnswer: "Professional pragmatism versus moral hesitation.",
      },
      {
        id: "q6",
        prompt: "What does Helena finally recognise about the theatre?",
        options: [
          "Its value lies in preserving evidence of everyday pleasure.",
          "Its survival could transform the city's economic prospects.",
          "Its removal would damage her personal reputation.",
          "Its importance has been exaggerated by nostalgia.",
        ],
        correctAnswer: "Its value lies in preserving evidence of everyday pleasure.",
      },
    ],
  },
] satisfies Array<Omit<Extract<Exercise, { type: "reading_part5" }>, "type" | "exam">>;

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

export function buildFallbackExercise(
  exam: Exam,
  part: PartId,
  excludeTitles: string[],
): Exercise | null {
  if (part !== "part5") return null;

  const excluded = new Set(excludeTitles.map(normalize));
  const pool = readingPart5Fallbacks;
  const selected =
    pool.find((paper) => !excluded.has(normalize(paper.title))) ??
    pool[Math.floor(Date.now() / 60000) % pool.length];

  return {
    ...selected,
    type: "reading_part5",
    exam,
  };
}
