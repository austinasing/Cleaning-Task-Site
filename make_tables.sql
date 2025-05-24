CREATE TABLE tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    task_name VARCHAR(32) NOT NULL,
    subtask VARCHAR(32) NOT NULL,
    signature VARCHAR(32) DEFAULT NULL
);

INSERT INTO tasks (task_name, subtask) VALUES
('kitchen_thurs','sinks'),
('kitchen_thurs','hotplate'),
('kitchen_thurs','island'),
('kitchen_thurs','counter'),
('kitchen_thurs','chillarea'),
('kitchen_thurs','sweep'),
('kitchen_thurs','mop'),
('kitchen_thurs','towels'),
('kitchen_sun','sinks'),
('kitchen_sun','hotplate'),
('kitchen_sun','island'),
('kitchen_sun','counter'),
('kitchen_sun','chillarea'),
('kitchen_sun','sweep'),
('kitchen_sun','mop'),
('kitchen_sun','towels'),
('bathroom','frontdrain_thurs'),
('bathroom','frontdrain_sun'),
('bathroom','behinddrain_thurs'),
('bathroom','behinddrain_sun'),
('bathroom','frontcabins'),
('bathroom','behindcabins'),
('bathroom','sinks'),
('bathroom','mirrors_shelves'),
('bathroom','sweep_mop'),
('bathroom','emptybin'),
('toilet_back','bowl_seat'),
('toilet_back','sweep_mop'),
('toilet_back','emptybin'),
('toilet_back','sink_mirror'),
('toilet_back','wall_door'),
('toilet_back','toiletpaper'),
('toilet_front','bowl_seat'),
('toilet_front','sweep_mop'),
('toilet_front','emptybin'),
('toilet_front','sink_mirror'),
('toilet_front','wall_door'),
('toilet_front','toiletpaper'),
('garbage','glass'),
('garbage','paper'),
('garbage','bags_tue'),
('garbage','bags_thur'),
('garbage','bags_sun'),
('garbage','cleanbins'),
('hallway','sweep'),
('hallway','mop');

CREATE TABLE roommates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    emoji VARCHAR(255) DEFAULT NULL,
    team INTEGER
    );
    
INSERT INTO roommates (name, team) VALUES
('Aisha', 8),
('Ale', 1),
('Ana', 5),
('Austin', 4),
('Damiaan', 6),
('Eva', 3),
('Freja', 2),
('Helene', 8),
('Isa', 6),
('Jette', 4),
('Macarena', 1),
('Mimi', 7),
('Niam', 2),
('Olga', 5),
('Selina', 3),
('Shauna', 7),
('Zarrin');

CREATE TABLE supplies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item VARCHAR(255) NOT NULL,
    collected TINYINT(1) NOT NULL DEFAULT 0
    );

INSERT INTO supplies (item) VALUES
('toiletpaper'),
('kitchenpaper'),
('dishsoap'),
('handsoap'),
('trashbag'),
('cleaningspray'),
('cleaningliquid'),
('gloves'),
('airfresh');

CREATE TABLE taskteams(
    id INT AUTO_INCREMENT PRIMARY KEY,
    taskname VARCHAR(32) NOT NULL,
    team_id INTEGER,
);

INSERT INTO taskteams (taskname) VALUES
('kitchen_thurs'),
('kitchen_sun'),
('bathroom'),
('toilet_back'),
('toilet_front'),
('garbage'),
('hallway');

CREATE TABLE wishlist(
    id INT AUTO_INCREMENT PRIMARY KEY,
    item VARCHAR(255) NOT NULL
);

CREATE TABLE latetask(
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(32) NOT NULL,
    day VARCHAR(32) NOT NULL,
    task VARCHAR(32) NOT NULL
);

