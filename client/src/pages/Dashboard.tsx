import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../api/admin';
import { resourcesApi } from '../api/resources';
import { statusProjectsApi } from '../api/statusProjects';
import { Resource, StatusProject } from '../types';
import { formatDivision } from '../utils/format';

function QuickStat({ label, value, detail, tone = 'neutral', onClick }: { label: string; value: string | number; detail?: string; tone?: 'neutral' | 'success' | 'warning' | 'danger'; onClick: () => void }) {
  return (
    <button className={`dashboard-quick-stat dashboard-quick-stat--${tone}`} onClick={onClick}>
      <div className="dashboard-quick-stat__label">{label}</div>
      <div className="dashboard-quick-stat__value">{value}</div>
      {detail && <div className="dashboard-quick-stat__detail">{detail}</div>}
    </button>
  );
}

function UtilizationBar({ label, value, count }: { label: string; value: number; count: number }) {
  const pct = Math.round(value * 100);
  const barColor = pct > 100 ? 'var(--usa-error)' : pct >= 80 ? 'var(--usa-success)' : pct >= 50 ? 'var(--usa-warning)' : 'var(--usa-error)';

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 14 }}>
        <span style={{ fontWeight: 600 }}>{formatDivision(label)}</span>
        <span>{pct}% avg ({count} resources)</span>
      </div>
      <div style={{ background: 'var(--usa-base-lightest)', borderRadius: 4, height: 12, overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: barColor, borderRadius: 4, transition: 'width .3s' }} />
      </div>
    </div>
  );
}

function ActionCard({ title, metric, detail, tone = 'neutral', ctaLabel, onClick }: { title: string; metric: string; detail: string; tone?: 'neutral' | 'success' | 'warning' | 'danger'; ctaLabel: string; onClick: () => void }) {
  return (
    <div className={`dashboard-action-card dashboard-action-card--${tone}`}>
      <div className="dashboard-action-card__eyebrow">{title}</div>
      <div className="dashboard-action-card__metric">{metric}</div>
      <p className="dashboard-action-card__detail">{detail}</p>
      <button className="usa-button usa-button--outline" onClick={onClick}>{ctaLabel}</button>
    </div>
  );
}

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="usa-card">
      <div className="usa-card__header">
        <div>
          <div className="usa-card__header-title">{title}</div>
          {subtitle && <div className="dashboard-section-subtitle">{subtitle}</div>}
        </div>
      </div>
      <div className="usa-card__body">{children}</div>
    </section>
  );
}

function ResourceListItem({ resource, metric, tone = 'neutral', onClick }: { resource: Resource; metric: string; tone?: 'neutral' | 'success' | 'warning' | 'danger'; onClick: () => void }) {
  return (
    <button className="dashboard-list-item" onClick={onClick}>
      <div>
        <div className="dashboard-list-item__title">{resource.lastName}, {resource.firstName}</div>
        <div className="dashboard-list-item__meta">
          {formatDivision(resource.division)} · {resource.primaryRole?.name || 'No primary role'} · {resource.functionalArea?.name || 'No functional area'}
        </div>
      </div>
      <span className={`dashboard-pill dashboard-pill--${tone}`}>{metric}</span>
    </button>
  );
}

function PopEndListItem({ resource, metric, tone = 'neutral', onClick }: { resource: Resource; metric: string; tone?: 'neutral' | 'success' | 'warning' | 'danger'; onClick: () => void }) {
  return (
    <button className="dashboard-list-item" onClick={onClick}>
      <div>
        <div className="dashboard-list-item__title">{resource.lastName}, {resource.firstName}</div>
        <div className="dashboard-list-item__meta">
          PoP ends {formatShortDate(resource.popEndDate)} · {formatDivision(resource.division)} · {resource.primaryRole?.name || 'No primary role'}
        </div>
      </div>
      <span className={`dashboard-pill dashboard-pill--${tone}`}>{metric}</span>
    </button>
  );
}

function StatusProjectListItem({ project, metric, subtitle, tone = 'neutral', onClick }: { project: StatusProject; metric: string; subtitle: string; tone?: 'neutral' | 'success' | 'warning' | 'danger'; onClick: () => void }) {
  return (
    <button className="dashboard-list-item" onClick={onClick}>
      <div>
        <div className="dashboard-list-item__title">{project.name}</div>
        <div className="dashboard-list-item__meta">{subtitle}</div>
      </div>
      <span className={`dashboard-pill dashboard-pill--${tone}`}>{metric}</span>
    </button>
  );
}

function EmptyListState({ message }: { message: string }) {
  return <div className="dashboard-list-empty">{message}</div>;
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatShortDate(value: string | null) {
  if (!value) return 'No date';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(value));
}

function daysUntil(value: string | null) {
  if (!value) return null;
  const now = new Date();
  const target = new Date(value);
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.ceil((target.getTime() - now.getTime()) / msPerDay);
}

export function Dashboard() {
  const navigate = useNavigate();
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => adminApi.stats(),
  });
  const { data: availableResourcesData, isLoading: isAvailableResourcesLoading } = useQuery({
    queryKey: ['dashboard-available-resources'],
    queryFn: () => resourcesApi.list({ page: '1', limit: '5', available: 'true', sortBy: 'availableCapacity', sortDir: 'desc' }),
  });
  const { data: stretchedResourcesData, isLoading: isStretchedResourcesLoading } = useQuery({
    queryKey: ['dashboard-stretched-resources'],
    queryFn: () => resourcesApi.list({ page: '1', limit: '5', sortBy: 'totalPercentUtilized', sortDir: 'desc' }),
  });
  const { data: statusProjectsData, isLoading: isStatusProjectsLoading } = useQuery({
    queryKey: ['dashboard-status-projects'],
    queryFn: () => statusProjectsApi.list(),
  });
  const { data: upcomingPopEndsData, isLoading: isUpcomingPopEndsLoading } = useQuery({
    queryKey: ['dashboard-upcoming-pop-ends'],
    queryFn: () => resourcesApi.list({ page: '1', limit: '5', resourceType: 'contractor', popEndWithinDays: '45', sortBy: 'popEndDate', sortDir: 'asc' }),
  });

  if (isLoading || !stats) {
    return (
      <div className="usa-page">
        <div className="usa-page-header"><h1 className="usa-page-title">Dashboard</h1></div>
        <span className="usa-spinner" aria-label="Loading" />
      </div>
    );
  }

  const availableResources = (availableResourcesData?.data ?? []).filter((resource) => resource.availableCapacity > 0);
  const stretchedResources = (stretchedResourcesData?.data ?? []).filter((resource) => resource.totalPercentUtilized > 1);
  const upcomingProjectTransitions = (statusProjectsData ?? []).filter((project) => {
    const days = daysUntil(project.plannedEndDate);
    return days !== null && days >= 0 && days <= 45;
  }).filter((project) => !project.actualEndDate).sort((a, b) => {
    return new Date(a.plannedEndDate!).getTime() - new Date(b.plannedEndDate!).getTime();
  }).slice(0, 5);
  const upcomingPopEnds = (upcomingPopEndsData?.data ?? []).filter((resource) => {
    const days = daysUntil(resource.popEndDate);
    return days !== null && days >= 0 && days <= 45;
  });

  return (
    <div className="usa-page">
      <div className="usa-page-header">
        <h1 className="usa-page-title">Dashboard</h1>
        <p className="usa-page-subtitle">Staffing coordination and near-term actions</p>
      </div>

      <div className="dashboard-quick-stats">
        <QuickStat label="Total Resources" value={stats.totalResources} detail={`${stats.federalCount} Federal / ${stats.contractorCount} Contractor`} onClick={() => navigate('/staffing/resources')} />
        <QuickStat label="Active Projects" value={stats.totalProjects} onClick={() => navigate('/projects')} />
        <QuickStat
          label="Avg Utilization"
          value={`${Math.round(stats.avgUtilization * 100)}%`}
          detail={stats.avgUtilization >= 0.8 ? 'Healthy — above 80%' : stats.avgUtilization >= 0.5 ? 'Underutilized — below 80%' : '⚠ Critical — below 50%'}
          tone={stats.avgUtilization >= 0.8 ? 'success' : stats.avgUtilization >= 0.5 ? 'warning' : 'danger'}
          onClick={() => navigate('/staffing/resources?sortBy=totalPercentUtilized&sortDir=desc')}
        />
        <QuickStat
          label="Available Resources"
          value={stats.availableResources}
          detail={stats.overCapacity > 0 ? `${stats.overCapacity} over capacity` : undefined}
          tone="success"
          onClick={() => navigate('/staffing/resources?sortBy=availableCapacity&sortDir=desc')}
        />
        <QuickStat
          label="Ending Within 30 Days"
          value={stats.endingSoonProjects}
          tone={stats.endingSoonProjects > 0 ? 'warning' : 'success'}
          onClick={() => navigate('/projects?sortBy=endDate&sortDir=asc')}
        />
      </div>

      <div className="dashboard-actions-grid">
        <ActionCard
          title="Suggested focus"
          metric={`${stats.overCapacity} overloaded ${stats.overCapacity === 1 ? 'resource' : 'resources'}`}
          detail={stats.overCapacity > 0 ? 'Rebalance assignments for people above 100% before pulling in new work.' : 'No one is over capacity right now, which gives you room to place new work intentionally.'}
          tone={stats.overCapacity > 0 ? 'danger' : 'success'}
          ctaLabel="Review utilization"
          onClick={() => navigate('/staffing/resources?sortBy=totalPercentUtilized&sortDir=desc')}
        />
        <ActionCard
          title="Suggested focus"
          metric={`${stats.availableResources} available ${stats.availableResources === 1 ? 'resource' : 'resources'}`}
          detail="Use bench capacity to staff open needs or protect upcoming transitions before they become urgent."
          tone={stats.availableResources > 0 ? 'success' : 'neutral'}
          ctaLabel="View available staff"
          onClick={() => navigate('/staffing/resources?available=true&sortBy=availableCapacity&sortDir=desc')}
        />
        <ActionCard
          title="Suggested focus"
          metric={`${stats.endingSoonProjects} ending soon`}
          detail="Projects nearing completion usually create staffing moves, backfills, or offboarding work. Get ahead of those handoffs here."
          tone={stats.endingSoonProjects > 0 ? 'warning' : 'neutral'}
          ctaLabel="Plan transitions"
          onClick={() => navigate('/projects?sortBy=endDate&sortDir=asc')}
        />
      </div>

      <div className="dashboard-section-grid">
        <SectionCard title="Who Can Take Work" subtitle="People with real remaining capacity right now">
          {isAvailableResourcesLoading ? (
            <span className="usa-spinner" aria-label="Loading available resources" />
          ) : availableResources.length > 0 ? (
            <div className="dashboard-list">
              {availableResources.map((resource) => (
                <ResourceListItem
                  key={resource.id}
                  resource={resource}
                  metric={`${Math.round(resource.availableCapacity * 100)}% free`}
                  tone="success"
                  onClick={() => navigate(`/staffing/resources/${resource.id}`)}
                />
              ))}
            </div>
          ) : (
            <EmptyListState message="Everyone is fully allocated or data has not been marked as available yet." />
          )}
        </SectionCard>

        <SectionCard title="Who Needs Relief" subtitle="People already carrying more than full capacity">
          {isStretchedResourcesLoading ? (
            <span className="usa-spinner" aria-label="Loading stretched resources" />
          ) : stretchedResources.length > 0 ? (
            <div className="dashboard-list">
              {stretchedResources.map((resource) => (
                <ResourceListItem
                  key={resource.id}
                  resource={resource}
                  metric={`${formatPercent(resource.totalPercentUtilized)} allocated`}
                  tone="danger"
                  onClick={() => navigate(`/staffing/resources/${resource.id}`)}
                />
              ))}
            </div>
          ) : (
            <EmptyListState message="No one is over capacity at the moment." />
          )}
        </SectionCard>
      </div>

      <div className="dashboard-section-grid">
        <SectionCard title="Upcoming Project Transitions" subtitle="In-progress work ending within the next 45 days">
          {isStatusProjectsLoading ? (
            <span className="usa-spinner" aria-label="Loading upcoming project transitions" />
          ) : upcomingProjectTransitions.length > 0 ? (
            <div className="dashboard-list">
              {upcomingProjectTransitions.map((project) => {
                const days = daysUntil(project.plannedEndDate);
                const tone = days !== null && days <= 14 ? 'danger' : 'warning';
                return (
                  <StatusProjectListItem
                    key={project.id}
                    project={project}
                    subtitle={`${project.application?.name || 'No application'} · ${project.program?.name || 'No program'}`}
                    metric={days !== null ? `${days}d left` : formatShortDate(project.plannedEndDate)}
                    tone={tone}
                    onClick={() => navigate(`/status/projects/${project.id}`)}
                  />
                );
              })}
            </div>
          ) : (
            <EmptyListState message="No in-progress projects are ending in the next 45 days." />
          )}
        </SectionCard>

        <SectionCard title="Upcoming PoP Ends" subtitle="Contractor Periods of Performance ending within the next 45 days">
          {isUpcomingPopEndsLoading ? (
            <span className="usa-spinner" aria-label="Loading upcoming PoP ends" />
          ) : upcomingPopEnds.length > 0 ? (
            <div className="dashboard-list">
              {upcomingPopEnds.map((resource) => {
                const days = daysUntil(resource.popEndDate);
                const tone = days !== null && days <= 14 ? 'danger' : 'warning';
                return (
                  <PopEndListItem
                    key={resource.id}
                    resource={resource}
                    metric={days !== null ? `${days}d left` : formatShortDate(resource.popEndDate)}
                    tone={tone}
                    onClick={() => navigate(`/staffing/resources/${resource.id}`)}
                  />
                );
              })}
            </div>
          ) : (
            <EmptyListState message="No contractor PoPs are ending in the next 45 days." />
          )}
        </SectionCard>
      </div>

      <div style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 18, marginBottom: 16 }}>Utilization by Division</h2>
        {stats.byDivision.map((d) => (
          <UtilizationBar key={d.division} label={d.division} value={d.avgUtilization} count={d.count} />
        ))}
      </div>

      <div style={{ marginTop: 32, display: 'flex', gap: 12 }}>
        <button className="usa-button usa-button--outline" onClick={() => navigate('/staffing/resources')}>View All Resources</button>
        <button className="usa-button usa-button--outline" onClick={() => navigate('/projects')}>View All Projects</button>
      </div>
    </div>
  );
}
