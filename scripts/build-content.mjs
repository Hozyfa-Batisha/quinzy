import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const SOURCES = path.join(ROOT, 'Sources');
const OUTPUT = path.join(ROOT, 'assets', 'js', 'data', 'lessons.js');
const CONFIG = path.join(ROOT, 'lessons.config.json');

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inlineFormat(text) {
  let result = escapeHtml(text);
  result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  result = result.replace(/`([^`]+)`/g, '<code>$1</code>');
  result = result.replace(/\$([^$]+)\$/g, '<span class="math">$1</span>');
  return result;
}

function parseTableRow(line) {
  return line
    .split('|')
    .map((cell) => cell.trim())
    .filter((cell) => cell.length > 0);
}

function markdownToHtml(markdown) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const html = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (/^---+$/.test(line.trim())) {
      html.push('<hr>');
      i++;
      continue;
    }

    if (line.trim().startsWith('```')) {
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(escapeHtml(lines[i]));
        i++;
      }
      html.push(`<pre><code>${codeLines.join('\n')}</code></pre>`);
      i++;
      continue;
    }

    if (line.includes('|') && i + 1 < lines.length && /^\|?\s*:?-/.test(lines[i + 1])) {
      const header = parseTableRow(line);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) {
        rows.push(parseTableRow(lines[i]));
        i++;
      }
      html.push('<div class="table-wrap"><table class="summary-table">');
      html.push('<thead><tr>' + header.map((h) => `<th>${inlineFormat(h)}</th>`).join('') + '</tr></thead>');
      html.push('<tbody>');
      rows.forEach((row) => {
        html.push('<tr>' + row.map((cell) => `<td>${inlineFormat(cell)}</td>`).join('') + '</tr>');
      });
      html.push('</tbody></table></div>');
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const content = heading[2].replace(/^[📚🎯💡🟢🔵🟣🟠🏋️1️⃣2️⃣3️⃣4️⃣5️⃣]+\s*/, '');
      const className = level === 2 && content.includes('الأهداف') ? 'objectives-heading' : '';
      html.push(`<h${level}${className ? ` class="${className}"` : ''}>${inlineFormat(content)}</h${level}>`);
      i++;
      continue;
    }

    if (/^\*\s+/.test(line.trim())) {
      const items = [];
      while (i < lines.length && /^\*\s+/.test(lines[i].trim())) {
        items.push(`<li>${inlineFormat(lines[i].trim().replace(/^\*\s+/, ''))}</li>`);
        i++;
      }
      html.push(`<ul>${items.join('')}</ul>`);
      continue;
    }

    if (/^\d+\.\s+/.test(line.trim())) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(`<li>${inlineFormat(lines[i].trim().replace(/^\d+\.\s+/, ''))}</li>`);
        i++;
      }
      html.push(`<ol>${items.join('')}</ol>`);
      continue;
    }

    if (line.trim().startsWith('$$')) {
      const block = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('$$')) {
        block.push(escapeHtml(lines[i]));
        i++;
      }
      html.push(`<pre class="math-block"><code>${block.join('\n')}</code></pre>`);
      i++;
      continue;
    }

    if (line.trim()) {
      html.push(`<p>${inlineFormat(line.trim())}</p>`);
    }

    i++;
  }

  return html.join('\n');
}

function stripTitleBlock(html) {
  return html.replace(/<h1>[\s\S]*?<\/h1>\s*(<hr>\s*)?/, '');
}

function extractObjectives(html) {
  const match = html.match(/<h2[^>]*class="objectives-heading"[^>]*>[\s\S]*?<\/h2>[\s\S]*?<ol>([\s\S]*?)<\/ol>/);
  if (!match) {
    return { body: stripTitleBlock(html), objectives: null };
  }

  const objectives = match[1];
  const body = stripTitleBlock(html.replace(match[0], ''));
  return {
    objectives: `<ol class="objectives-list">${objectives}</ol>`,
    body,
  };
}

function parseMcqBlock(block) {
  const questionMatch = block.match(/\*\*س\d+:\s*(.+?)\*\*/s);
  if (!questionMatch) return null;

  const question = questionMatch[1].trim();
  const optionMatches = [...block.matchAll(/^\*\s*([أ-ي])\)\s*(.+)$/gm)];
  const options = optionMatches.map((m) => ({
    key: m[1],
    text: m[2].trim(),
  }));

  const answerMatch = block.match(/\*\*الإجابة الصحيحة:\*\*\s*\*\*([أ-ي])\)?\s*(?:\([^)]*\))?/);
  const correct = answerMatch ? answerMatch[1] : null;

  if (!options.length || !correct) return null;

  return {
    type: 'mcq',
    question,
    options,
    correct,
  };
}

function parseTrueFalseBlock(block) {
  const items = [...block.matchAll(/\d+\.\s*\*\*\(\s*([✔❌])\s*\)\s*(.+?)\*\*/gs)];
  const questions = [];

  for (const item of items) {
    const isTrue = item[1] === '✔';
    const statement = item[2].trim();
    const after = block.slice(item.index + item[0].length);
    const correctionMatch = after.match(/\*\*التصحيح:\*\*\s*(.+?)(?=\n\d+\.|\n---|\n##|$)/s);
    questions.push({
      type: 'truefalse',
      question: statement,
      correct: isTrue,
      explanation: correctionMatch ? correctionMatch[1].trim() : '',
    });
  }

  return questions;
}

function parseMatchingBlock(block) {
  const introMatch = block.match(/\*\*(.+?)\*\*\s*\n((?:\d+\..+\n?)+)/s);
  if (!introMatch) return null;

  const leftItems = [...introMatch[2].matchAll(/^\d+\.\s*(.+)$/gm)].map((m) => m[1].trim());
  const answerSection = block.split('**الإجابة:**')[1];
  if (!answerSection) return null;

  const pairs = [...answerSection.matchAll(/\*\*(\d+)\s*👈\s*(.+?)\*\*/g)].map((m) => ({
    leftIndex: Number(m[1]) - 1,
    right: m[2].trim(),
  }));

  const rightOptions = [...new Set(pairs.map((p) => p.right))];
  const correctMap = {};
  pairs.forEach((p) => {
    correctMap[p.leftIndex] = p.right;
  });

  return {
    type: 'matching',
    question: introMatch[1].trim(),
    leftItems,
    rightOptions,
    correctMap,
  };
}

function parseOpenQuestions(block) {
  const questions = [];
  const parts = block.split(/\*\*س\d+:/).slice(1);

  for (const part of parts) {
    const questionEnd = part.indexOf('*\n');
    let question = part.slice(0, questionEnd > -1 ? questionEnd : part.indexOf('\n')).trim();
    question = question.replace(/\*+$/, '').trim();
    const answerMatch = part.match(/\*\*الإجابة:\*\*\s*([\s\S]+?)(?=\n\*\*س|\n---|\n##|$)/);
    questions.push({
      type: 'open',
      question,
      modelAnswer: answerMatch ? answerMatch[1].trim() : '',
    });
  }

  return questions;
}

function parseExerciseBlock(block) {
  const titleMatch = block.match(/###\s*🏋️\s*(.+)/);
  if (!titleMatch) return null;

  const content = block.replace(/^###.+$/m, '').trim();
  return {
    type: 'exercise',
    title: titleMatch[1].trim(),
    content: markdownToHtml(content),
  };
}

function getMarkdownSection(markdown, headingPattern) {
  const heading = new RegExp(`^##[^\\n]*${headingPattern}[^\\n]*\\n([\\s\\S]*?)(?=^##\\s|(?![\\s\\S]))`, 'm');
  return markdown.match(heading)?.[1] ?? '';
}

// كتاب الفائز uses numbered questions, bracketed choices, and a separate answer key.
function parseAlfaezQuestionsMarkdown(markdown) {
  const questions = [];
  const mcqSection = getMarkdownSection(markdown, '(?:MCQ|اختر الإجابة)');
  const answersSection = getMarkdownSection(markdown, 'نموذج الإجابة');
  const mcqAnswers = new Map(
    [...answersSection.matchAll(/^\s*(\d+)\.\s*\*\*\[([أ-ي])\]\*\*/gm)].map((match) => [Number(match[1]), match[2]])
  );

  const mcqPattern = /^\s*(\d+)\.\s*\*\*(.+?)\*\*\s*\n((?:\s*-\s+\[[أ-ي]\]\s*.+(?:\n|$))+)/gm;
  for (const match of mcqSection.matchAll(mcqPattern)) {
    const number = Number(match[1]);
    const options = [...match[3].matchAll(/^\s*-\s+\[([أ-ي])\]\s*(.+)$/gm)].map((option) => ({
      key: option[1],
      text: option[2].trim(),
    }));
    const correct = mcqAnswers.get(number);
    if (options.length && correct) {
      questions.push({ type: 'mcq', question: match[2].trim(), options, correct });
    }
  }

  const trueFalseSection = getMarkdownSection(markdown, 'الصحيحة وعلامة');
  const trueFalseAnswers = new Map(
    [...answersSection.matchAll(/^\s*(\d+)\.\s*\(\s*([✔❌])\s*\)\s*(.+)$/gm)].map((match) => [
      Number(match[1]),
      { correct: match[2] === '✔', explanation: match[3].replace(/^(?:صواب\.?|خطأ\s*-\s*)\s*/, '').trim() },
    ])
  );
  for (const match of trueFalseSection.matchAll(/^\s*(\d+)\.\s*\(\s*\)\s*(.+)$/gm)) {
    const answer = trueFalseAnswers.get(Number(match[1]));
    if (answer) questions.push({ type: 'truefalse', question: match[2].trim(), ...answer });
  }

  const completionSection = getMarkdownSection(markdown, 'أكمل العبارات');
  const completionAnswers = answersSection.match(/###\s*إجابة السؤال الثالث[^\n]*\n([\s\S]*)$/m)?.[1] ?? '';
  const completionAnswerMap = new Map(
    [...completionAnswers.matchAll(/^\s*(\d+)\.\s*(.+)$/gm)].map((match) => [Number(match[1]), match[2].trim()])
  );
  for (const match of completionSection.matchAll(/^\s*(\d+)\.\s*(.+)$/gm)) {
    questions.push({
      type: 'open',
      question: match[2].trim(),
      modelAnswer: completionAnswerMap.get(Number(match[1])) ?? '',
    });
  }

  const exercises = [];
  const exerciseSection = getMarkdownSection(markdown, 'مسائل تحويلات');
  for (const match of exerciseSection.matchAll(/^###\s*(تمرين\s*\d+[^\n]*)\n([\s\S]*?)(?=^###\s|(?![\s\S]))/gm)) {
    exercises.push({ type: 'exercise', title: match[1].trim(), content: markdownToHtml(match[2].trim()) });
  }

  return { questions, exercises };
}

function parseQuestionsMarkdown(markdown) {
  if (markdown.includes('كتاب الفائز')) {
    return parseAlfaezQuestionsMarkdown(markdown);
  }

  const questions = [];
  const sections = markdown.split(/^##\s/m).slice(1);

  for (const section of sections) {
    const sectionText = '## ' + section;

    if (section.includes('الاختيار من متعدد') || section.includes('MCQs')) {
      const blocks = section.split(/\*\*س\d+:/).slice(1);
      for (const block of blocks) {
        const parsed = parseMcqBlock('**س1:' + block);
        if (parsed) questions.push(parsed);
      }
    }

    if (section.includes('الصواب والخطأ')) {
      questions.push(...parseTrueFalseBlock(sectionText));
    }

    if (section.includes('المزاوجة')) {
      const parsed = parseMatchingBlock(sectionText);
      if (parsed) questions.push(parsed);
    }

    if (section.includes('تمارين التحويل')) {
      const exercises = section.split(/^###\s/m).slice(1);
      for (const ex of exercises) {
        const parsed = parseExerciseBlock('### ' + ex);
        if (parsed) questions.push(parsed);
      }
    }

    if (section.includes('دراسات حالة')) {
      const caseMatch = section.match(/\*\*دراسة حالة:[\s\S]+/);
      if (caseMatch) {
        questions.push({
          type: 'exercise',
          title: 'دراسة حالة',
          content: markdownToHtml(caseMatch[0]),
        });
      }
    }

    if (
      section.includes('التفكير') ||
      section.includes('التعليلات') ||
      section.includes('التطبيق البرمجي')
    ) {
      questions.push(...parseOpenQuestions(sectionText));
    }
  }

  return { questions, exercises: questions.filter((q) => q.type === 'exercise') };
}

function build() {
  const config = JSON.parse(fs.readFileSync(CONFIG, 'utf8'));
  const lessons = config
    .sort((a, b) => a.order - b.order)
    .map((lesson) => {
      const summaryPath = path.join(SOURCES, lesson.summaryFile);
      const questionsPath = path.join(SOURCES, lesson.questionsFile);

      const summaryMd = fs.readFileSync(summaryPath, 'utf8');
      const questionsMd = fs.readFileSync(questionsPath, 'utf8');

      const summaryHtml = markdownToHtml(summaryMd);
      const { objectives, body } = extractObjectives(summaryHtml);
      const parsedQuestions = parseQuestionsMarkdown(questionsMd);
      const questions = parsedQuestions.questions;

      const quizQuestions = questions.filter((q) => q.type !== 'exercise');
      const exercises = parsedQuestions.exercises.length
        ? parsedQuestions.exercises
        : questions.filter((q) => q.type === 'exercise');

      return {
        id: lesson.id,
        order: lesson.order,
        titleAr: lesson.titleAr,
        titleEn: lesson.titleEn,
        description: lesson.description,
        objectives,
        summaryHtml: body,
        exercises,
        questions: quizQuestions,
        stats: {
          mcq: quizQuestions.filter((q) => q.type === 'mcq').length,
          truefalse: quizQuestions.filter((q) => q.type === 'truefalse').length,
          matching: quizQuestions.filter((q) => q.type === 'matching').length,
          open: quizQuestions.filter((q) => q.type === 'open').length,
          exercises: exercises.length,
          total: quizQuestions.length,
        },
      };
    });

  const output = `/* Auto-generated by scripts/build-content.mjs — do not edit manually */\nwindow.LESSON_DATA = ${JSON.stringify(lessons, null, 2)};\n`;

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, output, 'utf8');

  console.log(`Built ${lessons.length} lessons -> ${OUTPUT}`);
  lessons.forEach((l) => {
    console.log(`  - ${l.titleAr}: ${l.stats.total} quiz + ${l.stats.exercises} exercises`);
  });
}

build();
