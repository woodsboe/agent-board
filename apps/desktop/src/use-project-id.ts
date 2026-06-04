import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAppStore } from "./store";

export function useProjectId() {
  const { projectId } = useParams<{ projectId: string }>();
  const setActiveProjectId = useAppStore((state) => state.setActiveProjectId);

  useEffect(() => {
    if (projectId) {
      setActiveProjectId(projectId);
    }
  }, [projectId, setActiveProjectId]);

  return projectId ?? null;
}
