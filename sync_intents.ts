import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  const filePath = path.join(__dirname, 'UserJourney-Agent.json');
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const intents = data.data.intents;

  const flow = await prisma.flow.findFirst({
    where: { name: 'Default Flow' }
  });

  if (!flow) {
    console.log("No 'Default Flow' found. Please ensure it exists.");
    return;
  }

  console.log(`Deleting old intents for flow ${flow.id}...`);
  await prisma.intent.deleteMany({
    where: { flowId: flow.id }
  });

  console.log(`Inserting ${intents.length} new intents...`);
  const intentData = intents.map((intent: any) => ({
    flowId: flow.id,
    name: intent.name || 'Unnamed Intent',
    trainingPhrases: intent.trainingPhrases || [],
    responseType: intent.responseType || 'text',
    response: intent.response || '',
    options: intent.options || '',
    metadata: intent.metadata || {}
  }));

  await prisma.intent.createMany({
    data: intentData
  });

  console.log('Successfully synced intents to DB!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
