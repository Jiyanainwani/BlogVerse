require("dotenv").config();

const mongoose = require("mongoose");
const { randomBytes } = require("node:crypto");
const Blog = require("../models/blog");
const User = require("../models/user");

const oldTitles = [
  "Building a video chat app from the ground up",
  "What I learned while moving a project to the cloud",
  "A tiny editor extension that saves a lot of context switching",
  "Seeing everyday images in a new way with computer vision",
  "Making a simple game feel good to play",
];

const samples = [
  {
    title: "The small joy of a slow morning",
    category: "Lifestyle",
    coverImageURL: "/images/sample-covers/slow-morning.svg",
    body: `For a long time, I treated mornings like a race: check the phone, skim the news, answer one message before getting out of bed. Then I tried something simpler. I left the phone in another room and made tea before making a plan.\n\nNothing dramatic changed. The day still had its errands and deadlines. But the first quiet half hour gave me a little room to notice the light moving across the kitchen and to decide what actually needed my attention.\n\nA slow morning does not have to mean a perfect routine. It can be one small pause that belongs to you before the day begins asking for things.`,
  },
  {
    title: "A notebook for things I almost forgot",
    category: "Creativity",
    coverImageURL: "/images/sample-covers/notebook.svg",
    body: `My notebook is not a productivity system. It is a place to put the small things that would otherwise keep circling in my head: a line from a conversation, a recipe to try, the name of a street I want to walk down.\n\nSome pages are tidy; most are not. A grocery list sits beside a sketch, and an idea I thought was brilliant at midnight gets a question mark the next morning. That is part of the charm. The notebook does not ask every thought to become a project.\n\nWriting things down has made me more present. I can let an idea rest on the page and return to the moment I am in.`,
  },
  {
    title: "The long way home through the old market",
    category: "Culture",
    coverImageURL: "/images/sample-covers/market.svg",
    body: `I took the long way home because the main road was crowded. The detour led through the old market, where a flower seller was arranging marigolds and a radio played from somewhere above the tailor's shop.\n\nI had walked that lane before, but usually with somewhere to be. This time I noticed the painted signs, the uneven stone beneath my shoes, and the way shopkeepers greeted one another across the street.\n\nA familiar place can feel new when we stop treating it as the space between two destinations.`,
  },
  {
    title: "Learning to cook by paying attention",
    category: "Food",
    coverImageURL: "/images/sample-covers/kitchen.svg",
    body: `I used to follow recipes as if they were instructions for assembling furniture: measure every step, worry when something looked different, and hope the result matched the picture. Cooking got easier when I started paying attention instead.\n\nIs the pan hot enough? Does the onion smell sweet yet? Could this use a squeeze of lemon? These are small questions, but they turn a recipe into a conversation with the ingredients.\n\nI still look up timings and proportions. I just trust my senses a little more, and dinner has become less of a test and more of a practice.`,
  },
  {
    title: "A pocket guide to looking up at the sky",
    category: "Travel",
    coverImageURL: "/images/sample-covers/stars.svg",
    body: `You do not need a telescope to begin learning the night sky. Start with one bright object and give your eyes a few minutes to adjust. On a clear evening, even a handful of stars can become a map once you know which patterns to look for.\n\nI began by finding the same constellation from my balcony each week. Some nights the city lights made it difficult; other nights the moon changed the whole scene. The small ritual made me curious about the season, the weather, and what was moving overhead.\n\nThe sky is a generous reminder that there is always more to notice than we can take in at once.`,
  },
];

async function seed() {
  if (!process.env.MONGO_URL) throw new Error("MONGO_URL is missing from .env");
  await mongoose.connect(process.env.MONGO_URL);

  await Blog.deleteMany({ title: { $in: oldTitles } });

  let author = await User.findOne();
  if (!author) {
    author = await User.create({
      fullName: "BlogVerse Community",
      email: "community@blogverse.local",
      password: randomBytes(32).toString("hex"),
    });
  }

  let added = 0;
  for (const sample of samples) {
    const exists = await Blog.exists({ title: sample.title });
    if (exists) {
      await Blog.updateOne({ _id: exists._id }, { $set: { category: sample.category } });
      continue;
    }
    await Blog.create({ ...sample, createdBy: author._id });
    added += 1;
  }
  console.log(`Added ${added} sample blog${added === 1 ? "" : "s"}.`);
}

seed()
  .catch((error) => {
    console.error("Could not seed sample blogs:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
