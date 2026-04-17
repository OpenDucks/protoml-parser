const fs = require("fs");
const path = require("path");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeIfMissing(filePath, content) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, content);
  }
}

function scaffoldMeeting(target = process.cwd()) {
  const targetDir = path.resolve(target);
  ensureDir(targetDir);

  const meetingPath = path.join(targetDir, "meeting.pml");
  writeIfMissing(meetingPath, `@tags_import "_tags.pml"
@protocol "Meeting Protocol - {{date}}"

@date:01.01.2026

@participants
=pt1:Jane Doe,jane,jane@example.com

@subjects
=0:Status update

@tasks
-[ ] Prepare notes @ptp=pt1 =0 @tag=important

@notes
- Starter meeting created by scaffold.

@meeting "Minutes"
# Team Meeting
## Participants
@@e=pt1
## Topic
@@e=0
`);

  const tagsPath = path.join(targetDir, "_tags.pml");
  writeIfMissing(tagsPath, `@title "Shared Tags"

@tags
=important:Important
=normal:Normal
`);

  return { targetDir, files: [meetingPath, tagsPath] };
}

function initProject(target = process.cwd()) {
  const targetDir = path.resolve(target);
  ensureDir(targetDir);
  ensureDir(path.join(targetDir, "meetings"));
  ensureDir(path.join(targetDir, "macros"));

  const tagsPath = path.join(targetDir, "_tags.pml");
  writeIfMissing(tagsPath, `@title "Project Tags"

@tags
=important:Important
=review:Needs review

@tag_sources
- "meetings/main.pml"
`);

  const meetingPath = path.join(targetDir, "meetings", "main.pml");
  writeIfMissing(meetingPath, `@tags_import "../_tags.pml"
@protocol "Project Protocol - {{date}}"

@date:01.01.2026

@participants
=pt1:Jane Doe,jane,jane@example.com

@subjects
=0:Initial setup

@tasks
-[ ] Review project structure @ptp=pt1 =0 @tag=important

@meeting "Kickoff"
# Project Kickoff
@@e=0
`);

  return { targetDir, files: [tagsPath, meetingPath] };
}

module.exports = {
  scaffoldMeeting,
  initProject,
};
