#!/usr/bin/env node

/**
 * DoD Tracker - Updates and reports on Production Readiness DoD
 * 
 * Usage:
 *   npm run dod:status              # Show current status
 *   npm run dod:update P1.2.1 done  # Mark task as complete
 *   npm run dod:update P1.2.1 wip   # Mark task as in progress
 *   npm run dod:next                # Show next 5 actions
 *   npm run dod:report              # Generate detailed report
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOD_PATH = path.join(__dirname, '../docs/PRODUCTION_READINESS_DOD.md');

const STATUS_ICONS = {
  complete: '✅',
  wip: '🚧',
  planned: '⏳',
  blocked: '❌',
  review: '🔄'
};

const STATUS_LABELS = {
  complete: 'Complete',
  wip: 'In Progress',
  planned: 'Planned',
  blocked: 'Blocked',
  review: 'Under Review'
};

async function readDoD() {
  const content = await fs.readFile(DOD_PATH, 'utf-8');
  return content;
}

async function writeDoD(content) {
  await fs.writeFile(DOD_PATH, content, 'utf-8');
}

function parseDoD(content) {
  const lines = content.split('\n');
  const tasks = [];
  let currentPhase = '';
  let currentSection = '';
  
  for (const line of lines) {
    // Parse phase headers
    if (line.startsWith('## Phase')) {
      currentPhase = line.replace('##', '').trim();
      continue;
    }
    
    // Parse section headers
    if (line.startsWith('### ')) {
      currentSection = line.replace('###', '').trim();
      continue;
    }
    
    // Parse task lines
    const taskMatch = line.match(/^\*\*(P\d+\.\d+\.\d+)\*\*\s+(✅|🚧|⏳|❌|🔄)\s+(.+)$/);
    if (taskMatch) {
      const [, id, icon, title] = taskMatch;
      const status = Object.entries(STATUS_ICONS).find(([, i]) => i === icon)?.[0] || 'planned';
      tasks.push({
        id,
        status,
        icon,
        title,
        phase: currentPhase,
        section: currentSection,
        line
      });
    }
  }
  
  return tasks;
}

function updateTaskStatus(content, taskId, newStatus) {
  const lines = content.split('\n');
  const newIcon = STATUS_ICONS[newStatus];
  let updated = false;
  
  const updatedLines = lines.map(line => {
    const taskMatch = line.match(/^\*\*(P\d+\.\d+\.\d+)\*\*/);
    if (taskMatch && taskMatch[1] === taskId) {
      updated = true;
      // Replace the status icon
      return line.replace(/(✅|🚧|⏳|❌|🔄)/, newIcon);
    }
    return line;
  });
  
  if (!updated) {
    console.error(`Task ${taskId} not found`);
    return null;
  }
  
  // Update timestamp and change log
  const now = new Date().toISOString().split('T')[0];
  const updatedContent = updatedLines.join('\n')
    .replace(/Last Updated: .+/, `Last Updated: ${now}`)
    .replace(/## Change Log/, `## Change Log\n\n### ${now}\n- ${taskId} marked as ${STATUS_LABELS[newStatus]}\n`);
  
  return updatedContent;
}

function generateStatusReport(tasks) {
  const stats = {
    total: tasks.length,
    complete: tasks.filter(t => t.status === 'complete').length,
    wip: tasks.filter(t => t.status === 'wip').length,
    planned: tasks.filter(t => t.status === 'planned').length,
    blocked: tasks.filter(t => t.status === 'blocked').length,
    review: tasks.filter(t => t.status === 'review').length
  };
  
  const phaseStats = {};
  tasks.forEach(task => {
    const phase = task.phase.split(':')[0]; // Get just "Phase 0" part
    if (!phaseStats[phase]) {
      phaseStats[phase] = { total: 0, complete: 0 };
    }
    phaseStats[phase].total++;
    if (task.status === 'complete') {
      phaseStats[phase].complete++;
    }
  });
  
  console.log('\n📊 Production Readiness Status\n');
  console.log('================================');
  console.log(`Total Progress: ${stats.complete}/${stats.total} (${Math.round(stats.complete/stats.total*100)}%)`);
  console.log(`✅ Complete: ${stats.complete}`);
  console.log(`🚧 In Progress: ${stats.wip}`);
  console.log(`⏳ Planned: ${stats.planned}`);
  console.log(`❌ Blocked: ${stats.blocked}`);
  console.log(`🔄 Under Review: ${stats.review}`);
  
  console.log('\n📈 Phase Progress\n');
  console.log('----------------');
  Object.entries(phaseStats).forEach(([phase, stat]) => {
    const percent = Math.round(stat.complete/stat.total*100);
    const bar = '█'.repeat(Math.floor(percent/5)) + '░'.repeat(20 - Math.floor(percent/5));
    console.log(`${phase}: [${bar}] ${percent}% (${stat.complete}/${stat.total})`);
  });
}

function showNextActions(tasks, limit = 5) {
  const nextTasks = tasks
    .filter(t => t.status === 'planned' || t.status === 'blocked')
    .slice(0, limit);
  
  console.log('\n🎯 Next Actions\n');
  console.log('==============');
  nextTasks.forEach((task, i) => {
    console.log(`${i + 1}. ${task.id} - ${task.title}`);
    console.log(`   Phase: ${task.phase.split(':')[0]}`);
    console.log(`   Section: ${task.section}`);
    if (task.status === 'blocked') {
      console.log(`   ⚠️  BLOCKED`);
    }
    console.log();
  });
}

function generateDetailedReport(tasks) {
  console.log('\n📋 Detailed Task Report\n');
  console.log('======================\n');
  
  // Group by status
  const byStatus = {
    wip: tasks.filter(t => t.status === 'wip'),
    blocked: tasks.filter(t => t.status === 'blocked'),
    review: tasks.filter(t => t.status === 'review')
  };
  
  if (byStatus.wip.length > 0) {
    console.log('🚧 In Progress\n');
    console.log('--------------');
    byStatus.wip.forEach(task => {
      console.log(`• ${task.id}: ${task.title}`);
    });
    console.log();
  }
  
  if (byStatus.blocked.length > 0) {
    console.log('❌ Blocked\n');
    console.log('----------');
    byStatus.blocked.forEach(task => {
      console.log(`• ${task.id}: ${task.title}`);
    });
    console.log();
  }
  
  if (byStatus.review.length > 0) {
    console.log('🔄 Under Review\n');
    console.log('---------------');
    byStatus.review.forEach(task => {
      console.log(`• ${task.id}: ${task.title}`);
    });
    console.log();
  }
  
  // Critical path items (Phase 1)
  const phase1Tasks = tasks.filter(t => t.phase.includes('Phase 1') && t.status !== 'complete');
  if (phase1Tasks.length > 0) {
    console.log('🚨 Release Candidate Blockers\n');
    console.log('-----------------------------');
    phase1Tasks.forEach(task => {
      console.log(`• ${task.id}: ${task.title} [${task.icon}]`);
    });
  }
}

// CLI handling
async function main() {
  const [command, ...args] = process.argv.slice(2);
  
  try {
    const content = await readDoD();
    const tasks = parseDoD(content);
    
    switch (command) {
      case 'status':
        generateStatusReport(tasks);
        break;
        
      case 'update':
        const [taskId, newStatus] = args;
        if (!taskId || !newStatus) {
          console.error('Usage: dod:update <task-id> <status>');
          console.error('Status: done|wip|planned|blocked|review');
          process.exit(1);
        }
        const statusMap = {
          done: 'complete',
          complete: 'complete',
          wip: 'wip',
          progress: 'wip',
          planned: 'planned',
          blocked: 'blocked',
          review: 'review'
        };
        const mappedStatus = statusMap[newStatus.toLowerCase()];
        if (!mappedStatus) {
          console.error(`Invalid status: ${newStatus}`);
          process.exit(1);
        }
        const updated = updateTaskStatus(content, taskId.toUpperCase(), mappedStatus);
        if (updated) {
          await writeDoD(updated);
          console.log(`✅ Task ${taskId} marked as ${STATUS_LABELS[mappedStatus]}`);
        }
        break;
        
      case 'next':
        showNextActions(tasks, args[0] ? parseInt(args[0]) : 5);
        break;
        
      case 'report':
        generateStatusReport(tasks);
        generateDetailedReport(tasks);
        showNextActions(tasks);
        break;
        
      default:
        console.log('DoD Tracker Commands:');
        console.log('  status  - Show current status');
        console.log('  update  - Update task status');
        console.log('  next    - Show next actions');
        console.log('  report  - Generate full report');
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
