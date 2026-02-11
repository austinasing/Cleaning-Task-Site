// Clear all task group member overrides, except for supplies users with taskTeam = null

const { MongoClient, ObjectId } = require('mongodb');

const uri = 'mongodb://admin:cleaning_dev_2026@localhost:27017/cleaning_tasks?authSource=admin';

async function clearOverrides() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('cleaning_tasks');
    const users = db.collection('users');
    const taskGroups = db.collection('taskGroups');

    // Find users with taskTeam = null (supplies users)
    const suppliesUsers = await users.find({ taskTeam: null }).toArray();
    console.log(`Found ${suppliesUsers.length} supplies users:`, suppliesUsers.map(u => u.name));

    // Clear all task group members
    await taskGroups.updateMany({}, { $set: { members: [] } });
    console.log('Cleared all task group members');

    // Add supplies users to the supplies task group
    if (suppliesUsers.length > 0) {
      const suppliesMembers = suppliesUsers.map(u => ({
        userId: u._id,
        name: u.name
      }));

      const result = await taskGroups.updateOne(
        { name: 'supplies' },
        { $set: { members: suppliesMembers } }
      );
      console.log(`Added ${suppliesUsers.length} users to supplies group`);
    }

    console.log('✓ Override cleanup complete!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

clearOverrides();
