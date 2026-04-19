const fs = require('fs');
const path = require('path');

function updateRoadmap(phases) {
    const filePath = path.join(__dirname, '../docs/phases/NexDesk-Phases.txt');
    let html = fs.readFileSync(filePath, 'utf8');

    const plannedMatch = html.match(/<strong>📌 Planned: (\d+)<\/strong>/);
    if (plannedMatch) {
        const currentPlanned = parseInt(plannedMatch[1]);
        const newPlanned = currentPlanned + phases.length;
        html = html.replace(/<strong>📌 Planned: \d+<\/strong>/, `<strong>📌 Planned: ${newPlanned}</strong>`);
    }

    let tableRows = '';
    phases.forEach(p => {
        tableRows += `<tr><td><p><strong>${p.id}</strong></p></td><td><p>${p.title}</p></td><td><p>${p.category}</p></td><td><p><strong>${p.status}</strong></p></td></tr>`;
    });
    
    const tableEndIndex = html.indexOf('</tbody></table>');
    html = html.slice(0, tableEndIndex) + tableRows + html.slice(tableEndIndex);

    let detailedSections = '';
    phases.forEach(p => {
        detailedSections += `
<hr />
<h1><strong>${p.id}  ${p.title}</strong></h1>
<table>
  <tr>
    <td><p><strong>Status: ${p.status}</strong></p></td>
    <td><p>Category: ${p.category}</p></td>
    <td><p>${p.description}</p></td>
  </tr>
</table>
<p><strong>Key Features</strong></p>
<p>${p.features.map(f => `▸ ${f}`).join('<p>')}</p>
<br />
<p><strong>Tech Stack: </strong>${p.tech}</p>`;
    });

    html += detailedSections;
    fs.writeFileSync(filePath, html, 'utf8');
    console.log(`Successfully added ${phases.length} phases to the roadmap.`);
}

const nextPhases = [];

// Helper to add phases in bulk
function addBulk(start, end, category, titlePrefix, tech) {
    for(let i = start; i <= end; i++) {
        nextPhases.push({
            id: `P${i}`,
            title: `${titlePrefix} (Module ${i})`,
            category: category,
            status: '📌 Planned',
            description: `Autonomous expansion of ${titlePrefix} capabilities for enterprise-grade IT operations.`,
            features: ['Automated scaling', 'Self-healing logic', 'Global sync'],
            tech: tech
        });
    }
}

// Filling the gaps from P251 to P700 (Current was P250)
// Epoch 4: Strategic Enterprise (251-400)
addBulk(251, 300, 'Strategy', 'Strategic Market Intelligence', 'Groq · Serper');
addBulk(301, 350, 'Ops', 'Autonomous Infrastructure Optimization', 'Terraform · AWS');
addBulk(351, 400, 'Legal', 'Autonomous Global Compliance', 'Legal-BERT · DocuSign');

// Epoch 5: Planetary & Space SRE (401-550)
addBulk(401, 450, 'Infrastructure', 'Space-Native Networking', 'Starlink · LEO Sat');
addBulk(451, 500, 'SRE', 'Planetary-Scale Reliability', 'Quantum Sync');
addBulk(501, 550, 'Interface', 'Neural-Link Support Interface', 'BCI · EEG');

// Epoch 6: The Digital Singularity (551-700)
addBulk(551, 600, 'Core', 'Autonomous Evolutionary Code', 'NexDesk Core v5');
addBulk(601, 650, 'Business', 'Sovereign AI Economic Units', 'Web3 · DAO');
addBulk(651, 699, 'Intelligence', 'Collective Cognitive Intelligence', 'Global Brain');

// Final Phase
nextPhases.push({
    id: 'P700',
    title: 'NexDesk Singularity: The Final Evolution',
    category: 'Core',
    status: '📌 Planned',
    description: 'The moment where NexDesk becomes the autonomous operating system for the global digital civilization.',
    features: ['Universal Autonomy', 'Zero-Human Intervention Ops', 'Infinite Scalability'],
    tech: 'Singularity Core'
});

updateRoadmap(nextPhases);
