<script lang="ts">
  interface Skill {
    id: string;
    name: string;
  }

  interface SkillCategory {
    id: string;
    name: string;
    icon: string;
    description: string;
    skills: Skill[];
    color: string;
  }

  const categories: SkillCategory[] = [
    {
      id: 'data',
      name: 'Data & Analytics',
      icon: '📊',
      description: 'Core analytical capabilities',
      color: 'var(--color-fill-1)',
      skills: [
        { id: 'python', name: 'Python' },
        { id: 'sql', name: 'SQL' },
        { id: 'r', name: 'R' },
        { id: 'data-stats', name: 'Statistical Modeling' },
        { id: 'data-ab', name: 'A/B Testing' },
        { id: 'data-mining', name: 'Data Mining' },
      ],
    },
    {
      id: 'viz',
      name: 'Visualization',
      icon: '📈',
      description: 'Bringing data to life',
      color: 'var(--color-fill-2)',
      skills: [
        { id: 'tableau', name: 'Tableau' },
        { id: 'looker', name: 'Looker Studio' },
        { id: 'd3', name: 'D3.js' },
        { id: 'viz-powerbi', name: 'Power BI' },
        { id: 'viz-matplotlib', name: 'Matplotlib' },
        { id: 'viz-seaborn', name: 'Seaborn' },
      ],
    },
    {
      id: 'web',
      name: 'Web Development',
      icon: '💻',
      description: 'Building interactive solutions',
      color: 'var(--color-fill-3)',
      skills: [
        { id: 'js', name: 'JavaScript' },
        { id: 'ts', name: 'TypeScript' },
        { id: 'react', name: 'React' },
        { id: 'web-vue', name: 'Vue' },
        { id: 'web-svelte', name: 'Svelte' },
        { id: 'web-astro', name: 'Astro' },
        { id: 'web-htmlcss', name: 'HTML/CSS' },
      ],
    },
    {
      id: 'cloud',
      name: 'Databases & Cloud',
      icon: '☁️',
      description: 'Data infrastructure',
      color: 'var(--color-fill-4)',
      skills: [
        { id: 'postgres', name: 'PostgreSQL' },
        { id: 'mongo', name: 'MongoDB' },
        { id: 'bigquery', name: 'BigQuery' },
        { id: 'cloud-aws', name: 'AWS' },
        { id: 'cloud-snowflake', name: 'Snowflake' },
        { id: 'cloud-etl', name: 'ETL Pipelines' },
      ],
    },
    {
      id: 'product',
      name: 'Product & Strategy',
      icon: '🎯',
      description: 'Driving business impact',
      color: 'var(--color-fill-5)',
      skills: [
        { id: 'product-analytics', name: 'Product Analytics' },
        { id: 'research', name: 'User Research' },
        { id: 'market', name: 'Market Analysis' },
        { id: 'product-kpi', name: 'KPI Design' },
        { id: 'product-agile', name: 'Agile' },
        { id: 'product-stakeholder', name: 'Stakeholder Mgmt' },
      ],
    },
    {
      id: 'tools',
      name: 'Tools & Methods',
      icon: '🛠️',
      description: 'Workflow & productivity',
      color: 'var(--color-fill-1)',
      skills: [
        { id: 'git', name: 'Git' },
        { id: 'jupyter', name: 'Jupyter' },
        { id: 'excel', name: 'Excel/GSheets' },
        { id: 'tools-figma', name: 'Figma' },
        { id: 'tools-notion', name: 'Notion' },
        { id: 'tools-jira', name: 'JIRA' },
        { id: 'tools-confluence', name: 'Confluence' },
      ],
    },
  ];

  let expandedId = $state<string | null>(null);

  function toggleExpand(id: string) {
    expandedId = expandedId === id ? null : id;
  }
</script>

<div class="bento-skills">
  <div class="bento-grid">
    {#each categories as category (category.id)}
      <div
        class="bento-card"
        class:expanded={expandedId === category.id}
        style:--category-color={category.color}
        onclick={() => toggleExpand(category.id)}
        role="button"
        tabindex="0"
        onkeydown={(e) => e.key === 'Enter' && toggleExpand(category.id)}
        aria-expanded={expandedId === category.id}
      >
        <div class="bento-card__inner">
          <div class="bento-card__header">
            <span class="bento-card__icon">{category.icon}</span>
            <div class="bento-card__title-group">
              <h3 class="bento-card__name">{category.name}</h3>
              <p class="bento-card__desc">{category.description}</p>
            </div>
            <span class="bento-card__expand-hint">
              {expandedId === category.id ? '−' : '+'}
            </span>
          </div>
          
          <div class="bento-card__skills" class:expanded={expandedId === category.id}>
            {#each (expandedId === category.id ? category.skills : category.skills.slice(0, 3)) as skill (skill.id)}
              <span class="skill-tag">
                {skill.name}
              </span>
            {/each}
          </div>
        </div>
      </div>
    {/each}
  </div>
  
  <p class="skills__note">
    <em>Click cards to expand</em>
  </p>
</div>

<style>
  .bento-skills {
    width: 100%;
  }

  .bento-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1rem;
    grid-auto-flow: dense;
    align-items: start;
  }

  @media (min-width: 768px) {
    .bento-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  .bento-card {
    background: var(--color-surface);
    border: 2px solid var(--color-stroke);
    border-radius: 16px;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    position: relative;
    overflow: hidden;
    filter: url(#sketch-filter);
    height: fit-content;
  }

  .bento-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 4px;
    background: var(--category-color);
    opacity: 0.7;
  }

  .bento-card:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-md);
  }

  .bento-card.expanded {
    grid-column: span 2;
    z-index: 10;
  }

  @media (max-width: 767px) {
    .bento-card.expanded {
      grid-column: span 1;
    }
  }

  .bento-card__inner {
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
  }

  .bento-card__header {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .bento-card__icon {
    font-size: 1.75rem;
    line-height: 1;
    flex-shrink: 0;
  }

  .bento-card__title-group {
    flex: 1;
    min-width: 0;
  }

  .bento-card__name {
    font-family: var(--font-hand);
    font-size: 1.125rem;
    font-weight: 600;
    margin: 0 0 0.25rem 0;
    line-height: 1.3;
  }

  .bento-card__desc {
    font-size: 0.8125rem;
    color: var(--color-text-muted);
    margin: 0;
    line-height: 1.4;
  }

  .bento-card__expand-hint {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: var(--color-bg);
    border: 1px solid var(--color-stroke-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text-muted);
    transition: all 0.2s ease;
    flex-shrink: 0;
  }

  .bento-card:hover .bento-card__expand-hint {
    background: var(--category-color);
    color: var(--color-text);
    border-color: var(--color-stroke);
  }

  .bento-card__skills {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    transition: all 0.3s ease;
  }

  .bento-card__skills.expanded {
    gap: 0.625rem;
  }

  .skill-tag {
    display: inline-block;
    font-family: var(--font-mono);
    font-size: 0.75rem;
    padding: 0.375rem 0.75rem;
    background: var(--color-bg);
    border: 1px solid var(--color-stroke-muted);
    border-radius: 6px;
    color: var(--color-text);
    transition: all 0.2s ease;
  }

  .skill-tag:hover {
    transform: translateY(-2px);
    box-shadow: 2px 2px 0 var(--color-stroke-muted);
  }

  .skills__note {
    text-align: center;
    font-family: var(--font-hand);
    font-size: 0.9375rem;
    color: var(--color-text-muted);
    font-style: italic;
    margin-top: 2rem;
  }
</style>
