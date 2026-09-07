import type { Metadata } from 'next';
import { Section } from '@/components/ui/Section';
import { Reveal } from '@/components/ui/Reveal';
import { ButtonLink } from '@/components/ui/Button';
import { ProjectCard } from '@/components/site/cards';
import { EmptyState } from '@/components/ui/Section';
import { getContentBlock, getProjects } from '@/lib/data/site';
import { FolderOpen } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Projects',
  description:
    'Selected client work delivered by Seedwel Investment Limited: websites, web applications, e-commerce, brand identity and business support projects in Zambia.',
  alternates: { canonical: '/projects' },
};

export default function ProjectsPage() {
  const intro = getContentBlock('projects.intro');
  const projects = getProjects();

  return (
    <>
      <section className="border-b border-navy-100 bg-navy-900 text-white">
        <div className="container-page py-14 sm:py-18 lg:py-20">
          <p className="eyebrow eyebrow-line text-brand-300">Portfolio</p>
          <h1 className="mt-4 max-w-3xl text-[2rem] font-semibold leading-[1.1] tracking-[-0.025em] sm:text-[2.5rem] lg:text-[3rem]">
            {intro?.title}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-navy-200 sm:text-lg">{intro?.subtitle}</p>
        </div>
      </section>

      <Section>
        <div className="container-page">
          {projects.length === 0 ? (
            <EmptyState
              icon={<FolderOpen size={28} />}
              title="No published projects yet"
              description="Project case studies are published as soon as our clients approve them."
              action={<ButtonLink href="/request-a-service">Start a project</ButtonLink>}
            />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((project, i) => (
                <Reveal key={project.id} delay={i * 50}>
                  <ProjectCard project={project} />
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </Section>
    </>
  );
}
