<script lang="ts">
  interface Skill {
    id: string;
    name: string;
  }

  interface SkillCategory {
    id: string;
    name: string;
    description: string;
    skills: Skill[];
    accentColor: string;
  }

  const categories: SkillCategory[] = [
    {
      id: 'data',
      name: 'Data & Analytics',
      description: 'Transforming raw data into actionable insights through statistical modeling and analytical rigor',
      accentColor: '#3b82f6',
      skills: [
        { id: 'python', name: 'Python' },
        { id: 'sql', name: 'SQL' },
        { id: 'r', name: 'R' },
        { id: 'stats', name: 'Statistical Modeling' },
        { id: 'ab', name: 'A/B Testing' },
        { id: 'mining', name: 'Data Mining' },
      ],
    },
    {
      id: 'viz',
      name: 'Visualization',
      description: 'Crafting compelling visual narratives that make complex data accessible',
      accentColor: '#10b981',
      skills: [
        { id: 'tableau', name: 'Tableau' },
        { id: 'looker', name: 'Looker Studio' },
        { id: 'd3', name: 'D3.js' },
        { id: 'powerbi', name: 'Power BI' },
        { id: 'matplotlib', name: 'Matplotlib' },
      ],
    },
    {
      id: 'web',
      name: 'Web Development',
      description: 'Building interactive, performant web applications',
      accentColor: '#f59e0b',
      skills: [
        { id: 'ts', name: 'TypeScript' },
        { id: 'react', name: 'React' },
        { id: 'svelte', name: 'Svelte' },
        { id: 'astro', name: 'Astro' },
        { id: 'nodejs', name: 'Node.js' },
      ],
    },
    {
      id: 'cloud',
      name: 'Databases & Cloud',
      description: 'Designing scalable data infrastructure',
      accentColor: '#8b5cf6',
      skills: [
        { id: 'postgres', name: 'PostgreSQL' },
        { id: 'mongo', name: 'MongoDB' },
        { id: 'bigquery', name: 'BigQuery' },
        { id: 'aws', name: 'AWS' },
        { id: 'snowflake', name: 'Snowflake' },
      ],
    },
    {
      id: 'product',
      name: 'Product & Strategy',
      description: 'Driving business impact through data-informed product decisions',
      accentColor: '#ec4899',
      skills: [
        { id: 'product-analytics', name: 'Product Analytics' },
        { id: 'research', name: 'User Research' },
        { id: 'market', name: 'Market Analysis' },
        { id: 'kpi', name: 'KPI Design' },
        { id: 'agile', name: 'Agile' },
        { id: 'stakeholder', name: 'Stakeholder Mgmt' },
      ],
    },
    {
      id: 'tools',
      name: 'Tools & Workflow',
      description: 'Productivity stack for efficient collaboration',
      accentColor: '#06b6d4',
      skills: [
        { id: 'git', name: 'Git' },
        { id: 'jupyter', name: 'Jupyter' },
        { id: 'figma', name: 'Figma' },
        { id: 'notion', name: 'Notion' },
      ],
    },
  ];

  let mounted = $state(false);

  $effect(() => {
    mounted = true;
  });
</script>

<div class="skills-container" class:mounted>
  <div class="skills-grid">
    {#each categories as category, i (category.id)}
      <div
        class="skill-card sketch-card"
        style="--hover-accent: {category.accentColor}; --delay: {i * 80}ms"
        role="region"
        aria-label="{category.name} skills"
      >
        <div class="sketch-card__accent" aria-hidden="true"></div>
        <div class="skill-card__content">
          <div class="skill-card__header">
            <div class="skill-card__icon-wrapper" style="--accent: {category.accentColor}">
              {#if category.id === 'data'}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M3 3v18h18" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              {:else if category.id === 'viz'}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M3 3v16a2 2 0 002 2h16" stroke-linecap="round" stroke-linejoin="round"/>
                  <rect x="7" y="13" width="3" height="5" rx="0.5"/>
                  <rect x="12" y="9" width="3" height="9" rx="0.5"/>
                  <rect x="17" y="5" width="3" height="13" rx="0.5"/>
                </svg>
              {:else if category.id === 'web'}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <rect x="2" y="3" width="20" height="14" rx="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M8 21h8M12 17v4" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M2 7h20" stroke-linecap="round"/>
                </svg>
              {:else if category.id === 'cloud'}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <ellipse cx="12" cy="5" rx="8" ry="4" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M4 5v6c0 2.2 3.6 4 8 4s8-1.8 8-4V5" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M4 11v6c0 2.2 3.6 4 8 4s8-1.8 8-4v-6" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              {:else if category.id === 'product'}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <circle cx="12" cy="12" r="10" stroke-linecap="round" stroke-linejoin="round"/>
                  <circle cx="12" cy="12" r="6" stroke-linecap="round" stroke-linejoin="round"/>
                  <circle cx="12" cy="12" r="2" fill="currentColor"/>
                </svg>
              {:else}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              {/if}
            </div>
            <div class="skill-card__title-group">
              <h3 class="skill-card__name">{category.name}</h3>
              <p class="skill-card__desc">{category.description}</p>
            </div>
          </div>
          
          <div class="skill-card__skills">
            {#each category.skills as skill (skill.id)}
              <span class="skill-chip">{skill.name}</span>
            {/each}
          </div>
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .skills-container {
    width: 100%;
    opacity: 0;
    transform: translateY(20px);
    transition: opacity 0.6s ease, transform 0.6s ease;
  }

  .skills-container.mounted {
    opacity: 1;
    transform: translateY(0);
  }

  .skills-grid {
    display: grid;
    grid-template-columns: repeat(1, 1fr);
    gap: var(--space-lg);
  }

  @media (min-width: 640px) {
    .skills-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (min-width: 1024px) {
    .skills-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  .skill-card {
    opacity: 0;
    transform: translateY(30px);
    animation: card-enter 0.6s ease forwards;
    animation-delay: var(--delay);
  }

  @keyframes card-enter {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .skill-card__content {
    padding: var(--space-lg);
  }

  .skill-card__header {
    display: flex;
    align-items: flex-start;
    gap: var(--space-md);
    margin-bottom: var(--space-md);
  }

  .skill-card__icon-wrapper {
    flex-shrink: 0;
    width: 44px;
    height: 44px;
    border-radius: var(--radius-md);
    background: var(--color-bg);
    border: 1px solid var(--color-stroke-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--accent);
    transition: all 0.2s ease;
  }

  .skill-card:hover .skill-card__icon-wrapper {
    background: var(--hover-accent);
    border-color: var(--hover-accent);
    color: white;
  }

  .skill-card__icon-wrapper :global(svg) {
    width: 22px;
    height: 22px;
  }

  .skill-card__title-group {
    flex: 1;
    min-width: 0;
  }

  .skill-card__name {
    font-family: var(--font-hand);
    font-size: var(--text-xl);
    margin: 0 0 var(--space-xs) 0;
    line-height: 1.3;
    color: var(--color-text);
  }

  .skill-card__desc {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
    margin: 0;
    line-height: 1.5;
  }

  .skill-card__skills {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs);
  }

  .skill-chip {
    display: inline-block;
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    padding: var(--space-xs) var(--space-sm);
    background: var(--color-bg);
    border: 1px solid var(--color-stroke-muted);
    border-radius: var(--radius-sm);
    color: var(--color-text);
    transition: all 0.15s ease;
  }

  .skill-chip:hover {
    border-color: var(--hover-accent);
    color: var(--hover-accent);
    transform: translateY(-1px);
  }

  /* Mobile */
  @media (max-width: 640px) {
    .skill-card {
      animation-duration: 0.4s;
    }

    .skill-card__content {
      padding: var(--space-md);
    }

    .skill-card__icon-wrapper {
      width: 40px;
      height: 40px;
    }

    .skill-card__icon-wrapper :global(svg) {
      width: 20px;
      height: 20px;
    }
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .skill-card {
      animation: none;
      opacity: 1;
      transform: none;
    }
  }
</style>
