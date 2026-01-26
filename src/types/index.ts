export interface Project {
  title: string;
  description: string;
  tags: string[];
  demoUrl?: string;
  codeUrl?: string;
  featured?: boolean;
  fillColor?: string;
}

export interface Experience {
  company: string;
  role: string;
  period: string;
  description: string;
  highlights: string[];
  current?: boolean;
}

export interface Skill {
  name: string;
  level: number; // 0-100
  category: string;
  fillColor?: string;
}

export interface SiteMetadata {
  title: string;
  description: string;
  author: string;
  siteUrl: string;
  socialLinks: {
    github?: string;
    linkedin?: string;
    twitter?: string;
    email?: string;
  };
}

export interface NavLink {
  label: string;
  href: string;
}
