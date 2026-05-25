import { Dispatch, RefObject, SetStateAction } from 'react';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import OrgChartTree from '@/components/org-chart/OrgChartTree';
import {
  CompanyNode,
  Department,
} from '@/components/org-chart/types';

interface OrgChartContentProps {
  scrollContainerRef: RefObject<HTMLDivElement>;
  loading: boolean;
  companyNodes: CompanyNode[];
  selectedDept: number | null;
  expandedNodes: Set<number>;
  expandedCompanies: Set<string>;
  setExpandedNodes: Dispatch<SetStateAction<Set<number>>>;
  setExpandedCompanies: Dispatch<SetStateAction<Set<string>>>;
  setSelectedDept: Dispatch<SetStateAction<number | null>>;
  isAdmin: boolean;
  setEditDept: Dispatch<SetStateAction<Department | null>>;
  setCreatingUnder: Dispatch<
    SetStateAction<{ parentId: number | null; companyId: number | null } | null>
  >;
  setEditCompany: Dispatch<SetStateAction<{ id: number; name: string } | null>>;
  setCreatingCompany: Dispatch<SetStateAction<boolean>>;
  departments: Department[];
  handleDeleteDept: (id: number) => Promise<void>;
  handleDeleteCompany: (id: number) => Promise<void>;
}

const OrgChartContent = ({
  scrollContainerRef,
  loading,
  companyNodes,
  selectedDept,
  expandedNodes,
  expandedCompanies,
  setExpandedNodes,
  setExpandedCompanies,
  setSelectedDept,
  isAdmin,
  setEditDept,
  setCreatingUnder,
  setEditCompany,
  setCreatingCompany,
  departments,
  handleDeleteDept,
  handleDeleteCompany,
}: OrgChartContentProps) => {
  return (
    <div
      ref={scrollContainerRef}
      className="flex-1 overflow-auto border rounded-lg bg-card p-6"
    >
      {loading ? (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <Icon name="Loader2" size={24} className="animate-spin mr-2" />
          Загрузка...
        </div>
      ) : companyNodes.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
          <Icon name="Building2" size={48} />
          <p>Компаний пока нет</p>
          {isAdmin && (
            <Button onClick={() => setCreatingCompany(true)} className="gap-2">
              <Icon name="Plus" size={14} />
              Создать первую компанию
            </Button>
          )}
        </div>
      ) : (
        <OrgChartTree
          companyNodes={companyNodes}
          selectedId={selectedDept}
          expandedNodes={expandedNodes}
          expandedCompanies={expandedCompanies}
          onToggleExpand={(id) =>
            setExpandedNodes((prev) => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            })
          }
          onToggleCompany={(key) =>
            setExpandedCompanies((prev) => {
              const next = new Set(prev);
              if (next.has(key)) next.delete(key);
              else next.add(key);
              return next;
            })
          }
          onSelect={(id) => setSelectedDept(id)}
          onEdit={isAdmin ? (d) => setEditDept(d) : undefined}
          onAddChild={
            isAdmin
              ? (parentId) => {
                  const parent = departments.find((d) => d.id === parentId);
                  setCreatingUnder({
                    parentId,
                    companyId: parent?.company_id ?? null,
                  });
                }
              : undefined
          }
          onDelete={isAdmin ? handleDeleteDept : undefined}
          onAddRootDept={
            isAdmin
              ? (companyId) => setCreatingUnder({ parentId: null, companyId })
              : undefined
          }
          onEditCompany={isAdmin ? (c) => setEditCompany(c) : undefined}
          onDeleteCompany={isAdmin ? handleDeleteCompany : undefined}
          onCreateCompany={isAdmin ? () => setCreatingCompany(true) : undefined}
        />
      )}
    </div>
  );
};

export default OrgChartContent;
