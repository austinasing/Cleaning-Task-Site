// MongoDB Initialization Script
// This runs automatically when the MongoDB container first starts
// It creates the database, collections, and indexes

// Switch to the cleaning_tasks database (creates it if it doesn't exist)
db = db.getSiblingDB('cleaning_tasks');

print('Initializing cleaning_tasks database...');

// ===================================
// CREATE COLLECTIONS
// ===================================
print('Creating collections...');

db.createCollection('users');
db.createCollection('weeks');
db.createCollection('taskGroups');
db.createCollection('subtasks');
db.createCollection('wishlist');
db.createCollection('hallwayTransactions');
db.createCollection('extraTasks');

print('Collections created');

// ===================================
// CREATE INDEXES
// ===================================
print('Creating indexes...');

// Users collection indexes
db.users.createIndex({ email: 1 }, { unique: true, sparse: true }); // Unique emails for login (sparse: null emails don't conflict)
db.users.createIndex({ name: 1 }); // Fast lookup by name

// Weeks collection indexes
db.weeks.createIndex({ year: 1, weekNumber: 1 }, { unique: true }); // One week per year
db.weeks.createIndex({ status: 1 }); // Fast lookup of active week

// Subtasks collection indexes
db.subtasks.createIndex({ weekId: 1, taskGroupName: 1 }); // Get all tasks for a week
db.subtasks.createIndex({ weekId: 1, signature: 1 }); // Who completed what

// TaskGroups collection indexes
db.taskGroups.createIndex({ name: 1 }, { unique: true }); // Unique task group names
db.taskGroups.createIndex({ type: 1, order: 1 }); // Sort by type and display order

// HallwayTransactions collection indexes
db.hallwayTransactions.createIndex({ userId: 1, createdAt: -1 }); // User transaction history
db.hallwayTransactions.createIndex({ month: 1 }); // Monthly reports

// ExtraTasks collection indexes
db.extraTasks.createIndex({ createdAt: -1 });  // Sort by newest first

print('Indexes created');