import { getErrorNotebookAction, ErrorNotebookScreen } from "@/features/error-notebook";

export default async function ErrorNotebookPage() {
  const { data } = await getErrorNotebookAction();
  
  return <ErrorNotebookScreen initialEntries={data || []} />;
}
