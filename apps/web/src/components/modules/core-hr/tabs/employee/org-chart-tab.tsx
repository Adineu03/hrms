'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  Search,
  ChevronRight,
  ChevronDown,
  User,
  Building2,
  Briefcase,
  Users,
  ArrowUp,
  ArrowDown,
  X,
  AlertCircle,
  Network,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary';

interface OrgNode {
  userId: string;
  name: string;
  designation: string;
  department: string;
  photoUrl?: string;
  children?: OrgNode[];
}

interface NodeDetail {
  userId: string;
  name: string;
  designation: string;
  department: string;
  photoUrl?: string;
  manager: { userId: string; name: string; designation: string } | null;
  peers: { userId: string; name: string; designation: string }[];
  directReports: { userId: string; name: string; designation: string }[];
}

function OrgTreeNode({
  node,
  onSelectNode,
  selectedId,
}: {
  node: OrgNode;
  onSelectNode: (userId: string) => void;
  selectedId: string | null;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="ml-4">
      <div
        className={`flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer transition-colors ${
          selectedId === node.userId
            ? 'bg-primary/10 border border-primary/30'
            : 'hover:bg-background'
        }`}
        onClick={() => onSelectNode(node.userId)}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="p-0.5 rounded text-text-muted hover:text-text"
          >
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
        ) : (
          <span className="w-4.5" />
        )}

        <div className="w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center flex-shrink-0">
          {node.photoUrl ? (
            <img
              src={node.photoUrl}
              alt={node.name}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <User className="h-4 w-4 text-text-muted" />
          )}
        </div>

        <div className="min-w-0">
          <p className="text-sm font-medium text-text truncate">{node.name}</p>
          <p className="text-xs text-text-muted truncate">
            {node.designation} {node.department ? `- ${node.department}` : ''}
          </p>
        </div>
      </div>

      {hasChildren && expanded && (
        <div className="border-l border-border ml-5">
          {node.children!.map((child, idx) => (
            <OrgTreeNode
              key={child.userId || `child-${idx}`}
              node={child}
              onSelectNode={onSelectNode}
              selectedId={selectedId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function OrgChartTab() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orgTree, setOrgTree] = useState<OrgNode[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<OrgNode[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [nodeDetail, setNodeDetail] = useState<NodeDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  useEffect(() => {
    fetchOrgChart();
  }, []);

  const fetchOrgChart = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get('/core-hr/employee/org-chart');
      setOrgTree(Array.isArray(res.data) ? res.data : [res.data]);
    } catch {
      setError('Failed to load org chart.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }
    setIsSearching(true);
    try {
      const res = await api.get(`/core-hr/employee/org-chart/search?q=${encodeURIComponent(query.trim())}`);
      const raw = res.data;
      setSearchResults(Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : []);
    } catch {
      // Silently fail on search
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectNode = async (userId: string) => {
    setSelectedNodeId(userId);
    setIsDetailLoading(true);
    try {
      const res = await api.get(`/core-hr/employee/org-chart/node/${userId}`);
      setNodeDetail(res.data);
    } catch {
      setNodeDetail(null);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const closeDetailPanel = () => {
    setSelectedNodeId(null);
    setNodeDetail(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-text-muted" />
        <span className="ml-2 text-text-muted">Loading org chart...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
        <AlertCircle className="h-4 w-4 flex-shrink-0" />
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-text flex items-center gap-2">
          <Network className="h-5 w-5" />
          Organization Chart
        </h3>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search people by name, department, or designation..."
          className={`${inputClassName} pl-10 text-sm`}
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-text-muted" />
        )}
      </div>

      {/* Search Results */}
      {searchResults !== null && (
        <div className="border border-border rounded-lg bg-background p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-text">
              Search Results ({searchResults.length})
            </h4>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSearchResults(null);
              }}
              className="text-xs text-text-muted hover:text-text transition-colors"
            >
              Clear search
            </button>
          </div>
          {searchResults.length === 0 ? (
            <p className="text-sm text-text-muted py-4 text-center">No results found.</p>
          ) : (
            <div className="space-y-2">
              {searchResults.map((node) => (
                <div
                  key={node.userId}
                  onClick={() => handleSelectNode(node.userId)}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-card cursor-pointer transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-text-muted" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text">{node.name}</p>
                    <p className="text-xs text-text-muted">
                      {node.designation} - {node.department}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main Content: Tree + Detail Panel */}
      <div className="flex gap-6">
        {/* Org Tree */}
        <div className="flex-1 min-w-0">
          {orgTree.length === 0 ? (
            <div className="text-center py-12">
              <Network className="h-10 w-10 text-text-muted mx-auto mb-3" />
              <p className="text-sm text-text-muted">
                Organization chart is not available yet.
              </p>
            </div>
          ) : (
            <div className="border border-border rounded-lg p-4 bg-background overflow-auto max-h-[600px]">
              {orgTree.map((node, idx) => (
                <OrgTreeNode
                  key={node.userId || `org-node-${idx}`}
                  node={node}
                  onSelectNode={handleSelectNode}
                  selectedId={selectedNodeId}
                />
              ))}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selectedNodeId && (
          <div className="w-80 flex-shrink-0 border border-border rounded-lg bg-background p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-text">Profile Details</h4>
              <button
                type="button"
                onClick={closeDetailPanel}
                className="p-1 rounded text-text-muted hover:text-text transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {isDetailLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
              </div>
            ) : nodeDetail ? (
              <div className="space-y-4">
                {/* Person Info */}
                <div className="text-center">
                  <div className="w-14 h-14 rounded-full bg-card border border-border flex items-center justify-center mx-auto mb-2">
                    {nodeDetail.photoUrl ? (
                      <img
                        src={nodeDetail.photoUrl}
                        alt={nodeDetail.name}
                        className="w-14 h-14 rounded-full object-cover"
                      />
                    ) : (
                      <User className="h-7 w-7 text-text-muted" />
                    )}
                  </div>
                  <p className="text-sm font-semibold text-text">{nodeDetail.name}</p>
                  <p className="text-xs text-text-muted flex items-center justify-center gap-1">
                    <Briefcase className="h-3 w-3" />
                    {nodeDetail.designation}
                  </p>
                  <p className="text-xs text-text-muted flex items-center justify-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {nodeDetail.department}
                  </p>
                </div>

                <hr className="border-border" />

                {/* Manager (Up) */}
                <div>
                  <h5 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1">
                    <ArrowUp className="h-3 w-3" />
                    Reports To
                  </h5>
                  {nodeDetail.manager ? (
                    <div
                      onClick={() => handleSelectNode(nodeDetail.manager!.userId)}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-card cursor-pointer transition-colors"
                    >
                      <div className="w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center">
                        <User className="h-3 w-3 text-text-muted" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-text">{nodeDetail.manager.name}</p>
                        <p className="text-xs text-text-muted">{nodeDetail.manager.designation}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-text-muted italic">No manager assigned</p>
                  )}
                </div>

                {/* Peers */}
                {nodeDetail.peers.length > 0 && (
                  <div>
                    <h5 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      Peers ({nodeDetail.peers.length})
                    </h5>
                    <div className="space-y-1">
                      {nodeDetail.peers.map((peer) => (
                        <div
                          key={peer.userId}
                          onClick={() => handleSelectNode(peer.userId)}
                          className="flex items-center gap-2 p-2 rounded-lg hover:bg-card cursor-pointer transition-colors"
                        >
                          <div className="w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center">
                            <User className="h-3 w-3 text-text-muted" />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-text">{peer.name}</p>
                            <p className="text-xs text-text-muted">{peer.designation}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Direct Reports (Down) */}
                {nodeDetail.directReports.length > 0 && (
                  <div>
                    <h5 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1">
                      <ArrowDown className="h-3 w-3" />
                      Direct Reports ({nodeDetail.directReports.length})
                    </h5>
                    <div className="space-y-1">
                      {nodeDetail.directReports.map((report) => (
                        <div
                          key={report.userId}
                          onClick={() => handleSelectNode(report.userId)}
                          className="flex items-center gap-2 p-2 rounded-lg hover:bg-card cursor-pointer transition-colors"
                        >
                          <div className="w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center">
                            <User className="h-3 w-3 text-text-muted" />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-text">{report.name}</p>
                            <p className="text-xs text-text-muted">{report.designation}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-text-muted text-center py-4">
                Unable to load details.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
