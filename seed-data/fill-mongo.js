/**
 * Seed the cleaning_tasks database with test data.
 *
 * Usage (from project root):
 *   docker exec -i cleaning-tasks-db mongosh -u admin -p cleaning_dev_2026 \
 *     --authenticationDatabase admin cleaning_tasks < seed-data/fill-mongo.js
 *
 * To reset and re-seed:
 *   Same command — it drops all collections first.
 */

// ===================================
// RESET: Drop all existing data and indexes
// ===================================
print('Dropping existing data...');

// Drop the problematic email index by name first (may have been created without sparse)
try { db.users.dropIndex("email_1"); } catch (e) { /* index may not exist */ }

db.users.drop();
db.weeks.drop();
db.taskGroups.drop();
db.subtasks.drop();
db.hallwayTransactions.drop();
db.extraTasks.drop();
db.wishlist.drop();
print('All collections dropped.');

// ===================================
// RECREATE INDEXES
// ===================================
print('Creating indexes...');
// sparse: true allows multiple null values (unclaimed users have null email)
db.users.createIndex({ email: 1 }, { unique: true, sparse: true });
db.users.createIndex({ name: 1 });
db.weeks.createIndex({ year: 1, weekNumber: 1 }, { unique: true });
db.weeks.createIndex({ status: 1 });
db.subtasks.createIndex({ weekId: 1, taskGroupName: 1 });
db.subtasks.createIndex({ weekId: 1, signature: 1 });
db.taskGroups.createIndex({ name: 1 }, { unique: true });
db.taskGroups.createIndex({ type: 1, order: 1 });
db.hallwayTransactions.createIndex({ userId: 1, createdAt: -1 });
db.hallwayTransactions.createIndex({ userId: 1, weekId: 1, type: 1 });  // For 15€ cap calculation
db.hallwayTransactions.createIndex({ status: 1, createdAt: -1 });       // For pending approvals
db.hallwayTransactions.createIndex({ claimGroupId: 1 });                // For paired fines
db.extraTasks.createIndex({ createdAt: -1 });
print('Indexes created.');

// ===================================
// FIXED IDs — used for cross-references
// ===================================
const USER_IDS = {
  austin:   ObjectId("aaa00000000000000000a001"),
  aisha:    ObjectId("aaa00000000000000000a002"),
  camille:  ObjectId("aaa00000000000000000a003"),
  pietro:   ObjectId("aaa00000000000000000a004"),
  damiaan:  ObjectId("aaa00000000000000000a005"),
  eva:      ObjectId("aaa00000000000000000a006"),
  freja:    ObjectId("aaa00000000000000000a007"),
  james:    ObjectId("aaa00000000000000000a008"),
  isa:      ObjectId("aaa00000000000000000a009"),
  jette:    ObjectId("aaa00000000000000000a010"),
  sarah:    ObjectId("aaa00000000000000000a011"),
  niko:     ObjectId("aaa00000000000000000a012"),
  anatole:  ObjectId("aaa00000000000000000a013"),
  vic:      ObjectId("aaa00000000000000000a014"),
  anike:    ObjectId("aaa00000000000000000a015"),
  manu:   ObjectId("aaa00000000000000000a016"),
  zarrin:   ObjectId("aaa00000000000000000a017"),
};

const PREV_WEEK_ID = ObjectId("bbb00000000000000000b001");
const WEEK_ID = ObjectId("bbb00000000000000000b002");

// ===================================
// INSERT WEEKS (previous + current)
// ===================================
print('Inserting weeks...');

// Week 6 (period 7, week 4 of period 7 - last week before rotation changes)
db.weeks.insertOne({
  _id: PREV_WEEK_ID,
  weekNumber: 6,
  year: 2026,
  startDate: new Date('2026-02-03T05:00:00Z'),  // Tuesday 6AM CET = 5AM UTC
  endDate: new Date('2026-02-10T04:59:59Z'),    // One second before next week starts
  status: 'completed',
  rotationPeriod: 7  // Period 7 in 16-period rotation
});

// Week 7 (period 8, week 1 of period 8 - first week of new period!)
db.weeks.insertOne({
  _id: WEEK_ID,
  weekNumber: 7,
  year: 2026,
  startDate: new Date('2026-02-10T05:00:00Z'),  // Tuesday 6AM CET = 5AM UTC
  endDate: new Date('2026-02-17T04:59:59Z'),    // One second before next week starts
  status: 'active',
  rotationPeriod: 8  // Period 8 in 16-period rotation
});

// ===================================
// INSERT USERS (17 roommates)
// ===================================
print('Inserting 17 users...');

function makeUser(id, name, role, email, taskTeam) {
  const user = {
    _id: id,
    name: name,
    active: true,
    passwordHash: "",
    role: role,
    emoji: "",
    preferences: { emailNotifications: false },
    hallwayBalance: 0,
    stats: { tasksCompleted: 0, lateTasks: 0, timesForgot: 0 },
    createdAt: new Date(),
    updatedAt: new Date()
  };
  // Only add email field if provided (sparse index requires omission, not null)
  if (email) {
    user.email = email;
  }
  // Task team for rotation (1-8), null for non-rotating users (supplies)
  if (taskTeam !== undefined) {
    user.taskTeam = taskTeam;
  }
  return user;
}

// Task teams are permanent user assignments. In Period 8:
// kitchen_fri=1, kitchen_mon=2, reserve=3, garbage=4, toilet_front=5,
// toilet_back=6, hallway=7, bathroom=8, supplies=null (no rotation)
db.users.insertMany([
  makeUser(USER_IDS.austin,  "Austin",   "admin",      null, 3),  // team 3 → reserve (P8)
  makeUser(USER_IDS.aisha,   "Aisha",    "member",     null, 8),  // team 8 → bathroom (P8)
  makeUser(USER_IDS.camille, "Camille",  "member",     null, 1),  // team 1 → kitchen_fri (P8)
  makeUser(USER_IDS.pietro,  "Pietro",   "member",     null, 2),  // team 2 → kitchen_mon (P8)
  makeUser(USER_IDS.damiaan, "Damiaan",  "member",     null, 5),  // team 5 → toilet_front (P8)
  makeUser(USER_IDS.eva,     "Eva",      "member",     null, 2),  // team 2 → kitchen_mon (P8)
  makeUser(USER_IDS.freja,   "Freja",    "member",     null, 6),  // team 6 → toilet_back (P8)
  makeUser(USER_IDS.james,   "James",    "member",     null, 8),  // team 8 → bathroom (P8)
  makeUser(USER_IDS.isa,     "Isa",      "member",     null, 5),  // team 5 → toilet_front (P8)
  makeUser(USER_IDS.jette,   "Jette",    "member",     null, 3),  // team 3 → reserve (P8)
  makeUser(USER_IDS.sarah,   "Sarah",    "member",     null, 1),  // team 1 → kitchen_fri (P8)
  makeUser(USER_IDS.niko,    "Niko",     "member",     null, 7),  // team 7 → hallway (P8)
  makeUser(USER_IDS.anatole, "Anatole",  "member",     null, 7),  // team 7 → hallway (P8)
  makeUser(USER_IDS.vic,     "Vic",      "member",     null, null), // unassigned
  makeUser(USER_IDS.anike,   "Anike",    "member",     null, 4),  // team 4 → garbage (P8)
  makeUser(USER_IDS.manu,    "Manu",     "member",     null, 6),  // team 6 → toilet_back (P8)
  makeUser(USER_IDS.zarrin,  "Zarrin",   "accountant", null, null), // supplies (no rotation)
]);

// ===================================
// INSERT TASK GROUPS (8 cleaning + 1 reserve)
// ===================================
print('Inserting task groups...');

// Task group assignments for Period 8 (16-period rotation)
// kitchen_fri=1, kitchen_mon=2, reserve=3, garbage=4, toilet_front=5,
// toilet_back=6, hallway=7, bathroom=8
db.taskGroups.insertMany([
  {
    name: "kitchen_fri",
    displayName: "Kitchen (Fri)",
    members: [
      { userId: USER_IDS.camille, name: "Camille" },  // team 1
      { userId: USER_IDS.sarah,   name: "Sarah" }     // team 1
    ],
    order: 1,
    updatedAt: new Date()
  },
  {
    name: "kitchen_mon",
    displayName: "Kitchen (Mon)",
    members: [
      { userId: USER_IDS.pietro, name: "Pietro" },  // team 2
      { userId: USER_IDS.eva,    name: "Eva" }      // team 2
    ],
    order: 2,
    updatedAt: new Date()
  },
  {
    name: "toilet_front",
    displayName: "Toilet (Front)",
    members: [
      { userId: USER_IDS.damiaan, name: "Damiaan" },  // team 5
      { userId: USER_IDS.isa,     name: "Isa" }       // team 5
    ],
    order: 3,
    updatedAt: new Date()
  },
  {
    name: "toilet_back",
    displayName: "Toilet (Back)",
    members: [
      { userId: USER_IDS.manu,  name: "Manu" },   // team 6
      { userId: USER_IDS.freja, name: "Freja" }   // team 6
    ],
    order: 4,
    updatedAt: new Date()
  },
  {
    name: "bathroom",
    displayName: "Bathroom",
    members: [
      { userId: USER_IDS.james, name: "James" },  // team 8
      { userId: USER_IDS.aisha, name: "Aisha" }   // team 8
    ],
    order: 5,
    updatedAt: new Date()
  },
  {
    name: "hallway",
    displayName: "Hallway",
    members: [
      { userId: USER_IDS.anatole, name: "Anatole" },  // team 7
      { userId: USER_IDS.niko,    name: "Niko" }      // team 7
    ],
    order: 6,
    updatedAt: new Date()
  },
  {
    name: "garbage",
    displayName: "Garbage",
    members: [
      { userId: USER_IDS.anike, name: "Anikė" }  // team 4 (only 1 member!)
    ],
    order: 7,
    updatedAt: new Date()
  },
  {
    name: "supplies",
    displayName: "Supplies",
    members: [
      { userId: USER_IDS.zarrin, name: "Zärrin" }
    ],
    order: 8,
    updatedAt: new Date()
  },
  {
    name: "reserve",
    displayName: "Reserve",
    members: [
      { userId: USER_IDS.austin, name: "Austin" },  // team 3
      { userId: USER_IDS.jette,  name: "Jette" }    // team 3
    ],
    order: 9,
    updatedAt: new Date()
  }
]);

// ===================================
// SUBTASK HELPER
// ===================================
function sub(taskGroupName, subtaskName, blockoutDay, order) {
  return {
    weekId: WEEK_ID,
    taskGroupName: taskGroupName,
    subtaskName: subtaskName,
    blockoutDay: blockoutDay,
    completedBy: null,
    completedAt: null,
    lateCompletedBy: null,
    lateCompletedAt: null,
    daysLate: 0,
    forgotten: false,
    forgottenBy: null,
    smiles: 0,
    frowns: 0,
    order: order,
    unclaimedFineProcessed: false,
    updatedAt: new Date(),
  };
}

// ===================================
// INSERT SUBTASKS
// ===================================
print('Inserting subtasks...');

// Kitchen (Fri) — blockoutDay 5 (Friday)
db.subtasks.insertMany([
  sub("kitchen_fri", "Sinks",        5, 1),
  sub("kitchen_fri", "Hotplate",     5, 2),
  sub("kitchen_fri", "Island",       5, 3),
  sub("kitchen_fri", "Counters",     5, 4),
  sub("kitchen_fri", "Chill Area",   5, 5),
  sub("kitchen_fri", "Sweep",        5, 6),
  sub("kitchen_fri", "Mop",          5, 7),
  sub("kitchen_fri", "Towels",       5, 8),
  sub("kitchen_fri", "Drying racks", 5, 9),
]);

// Kitchen (Mon) — blockoutDay 1 (Monday)
db.subtasks.insertMany([
  sub("kitchen_mon", "Sinks",        1, 1),
  sub("kitchen_mon", "Hotplate",     1, 2),
  sub("kitchen_mon", "Island",       1, 3),
  sub("kitchen_mon", "Counters",     1, 4),
  sub("kitchen_mon", "Chill Area",   1, 5),
  sub("kitchen_mon", "Sweep",        1, 6),
  sub("kitchen_mon", "Mop",          1, 7),
  sub("kitchen_mon", "Towels",       1, 8),
  sub("kitchen_mon", "Drying racks", 1, 9),
]);

// Toilet (Front) — blockoutDay 1
db.subtasks.insertMany([
  sub("toilet_front", "Seat + Bowl",   1, 1),
  sub("toilet_front", "Sweep + Mop",   1, 2),
  sub("toilet_front", "Empty Bin",     1, 3),
  sub("toilet_front", "Sink + Mirror", 1, 4),
  sub("toilet_front", "Walls + Door",  1, 5),
  sub("toilet_front", "Top up TP",     1, 6),
]);

// Toilet (Back) — blockoutDay 1
db.subtasks.insertMany([
  sub("toilet_back", "Seat + Bowl",   1, 1),
  sub("toilet_back", "Sweep + Mop",   1, 2),
  sub("toilet_back", "Empty Bin",     1, 3),
  sub("toilet_back", "Sink + Mirror", 1, 4),
  sub("toilet_back", "Walls + Door",  1, 5),
  sub("toilet_back", "Top up TP",     1, 6),
]);

// Bathroom — mixed blockoutDays
db.subtasks.insertMany([
  sub("bathroom", "Mid-Week Drains (Fri)", 5, 1),
  sub("bathroom", "Front Cabins / Floor",  1, 2),
  sub("bathroom", "Back Cabins / Floor",   1, 3),
  sub("bathroom", "Sinks",                 1, 4),
  sub("bathroom", "Mirrors + Shelves",     1, 5),
  sub("bathroom", "Sweep + Mop",           1, 6),
  sub("bathroom", "Empty Bin",             1, 7),
  sub("bathroom", "Clean Drains",          1, 8),
]);

// Hallway — blockoutDay 1
db.subtasks.insertMany([
  sub("hallway", "Sweep", 1, 1),
  sub("hallway", "Mop",   1, 2),
]);

// Garbage — mixed blockoutDays (lowercase to match taskGroup.name)
db.subtasks.insertMany([
  sub("garbage", "Glass",            1, 1),
  sub("garbage", "Paper",            1, 2),
  sub("garbage", "Check Bags (Wed)", 3, 3),
  sub("garbage", "Check Bags (Fri)", 5, 4),
  sub("garbage", "Check Bags (Mon)", 1, 5),
  sub("garbage", "Clean Bins",       1, 6),
]);

// Supplies — blockoutDay 1 (lowercase to match taskGroup.name)
db.subtasks.insertMany([
  sub("supplies", "Air Freshener",   1, 1),
  sub("supplies", "Cleaning Liquid", 1, 2),
  sub("supplies", "Cleaning Spray",  1, 3),
  sub("supplies", "Dish Soap",       1, 4),
  sub("supplies", "Gloves",          1, 5),
  sub("supplies", "Hand Soap",       1, 6),
  sub("supplies", "Kitchen Paper",   1, 7),
  sub("supplies", "Toilet Paper",    1, 8),
  sub("supplies", "Trash Bags",      1, 9),
]);

// ===================================
// EXTRA TASKS
// ===================================
print('Inserting extra tasks...');
db.extraTasks.insertMany([
  { taskDescription: "Sink of dishes",     value: 5,  createdBy: "Austin", completedBy: null, status: "available", createdAt: new Date() },
  { taskDescription: "Tidy living room",   value: 5,  createdBy: "Austin", completedBy: null, status: "available", createdAt: new Date() },
  { taskDescription: "Clean oven",         value: 10, createdBy: "Austin", completedBy: null, status: "available", createdAt: new Date() },
  { taskDescription: "Clean between boxes",value: 10, createdBy: "Austin", completedBy: null, status: "available", createdAt: new Date() },
]);

// ===================================
// WISHLIST
// ===================================
print('Inserting wishlist items...');
db.wishlist.insertMany([
  { item: "Small trashcans in front toilets", votes: [], createdAt: new Date() },
  { item: "Rice cooker",                      votes: [], createdAt: new Date() },
  { item: "Nice bluetooth speaker",           votes: [], createdAt: new Date() },
  { item: "Lots of new mop heads",            votes: [], createdAt: new Date() },
  { item: "Standing fan",                     votes: [], createdAt: new Date() },
  { item: "Vacuum cleaner",                   votes: [], createdAt: new Date() },
]);

// ===================================
// SUBTASK NOTES (shared tips for cleaning tasks)
// ===================================
print('Inserting subtask notes...');
const now = new Date();
db.subtaskNotes.insertMany([
  // Kitchen tasks
  { subtaskName: "Sinks", notes: [], updatedAt: now },
  { subtaskName: "Hotplate", notes: [], updatedAt: now },
  { subtaskName: "Island", notes: [], updatedAt: now },
  { subtaskName: "Counters", notes: [], updatedAt: now },
  { subtaskName: "Mop", notes: [], updatedAt: now },
  { subtaskName: "Towels", notes: [], updatedAt: now },
  // Toilet tasks
  { subtaskName: "Seat + Bowl", notes: [], updatedAt: now },
  { subtaskName: "Sink + Mirror", notes: [], updatedAt: now },
  { subtaskName: "Top up TP", notes: [], updatedAt: now },
  // Bathroom tasks
  { subtaskName: "Clean Drains", notes: [], updatedAt: now },
  { subtaskName: "Front Cabins / Floor", notes: [], updatedAt: now },
  { subtaskName: "Back Cabins / Floor", notes: [], updatedAt: now },
  // Garbage tasks
  { subtaskName: "Glass", notes: [], updatedAt: now },
  { subtaskName: "Paper", notes: [], updatedAt: now },
  { subtaskName: "Clean Bins", notes: [], updatedAt: now },
  // Supplies tasks
  { subtaskName: "Toilet Paper", notes: [], updatedAt: now },
  { subtaskName: "Trash Bags", notes: [], updatedAt: now }
]);

// ===================================
// VERIFICATION
// ===================================
print('\n=== Seed complete! Verifying... ===');
print('Users:         ' + db.users.countDocuments());
print('Weeks:         ' + db.weeks.countDocuments());
print('Task Groups:   ' + db.taskGroups.countDocuments());
print('Subtasks:      ' + db.subtasks.countDocuments());
print('Extra Tasks:   ' + db.extraTasks.countDocuments());
print('Wishlist:      ' + db.wishlist.countDocuments());
print('Subtask Notes: ' + db.subtaskNotes.countDocuments());
print('');
print('Subtasks per group:');
db.subtasks.aggregate([
  { $group: { _id: "$taskGroupName", count: { $sum: 1 } } },
  { $sort: { _id: 1 } }
]).forEach(r => print('  ' + r._id + ': ' + r.count));
print('\nDone! All IDs are deterministic — safe to re-run.');
