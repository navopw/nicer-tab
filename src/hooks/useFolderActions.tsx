import { useState } from "react";
import { FolderPlus, Pencil, Trash2 } from "lucide-react";
import type { BookmarkNode } from "../types/bookmark";
import type { ContextMenuItem } from "../components/common/ContextMenu";
import { useBookmarkStore } from "../stores/bookmarkStore";
import { countBookmarks } from "../lib/bookmark-tree";
import { deleteWithUndo } from "../lib/bookmark-actions";
import { CreateSubfolderModal } from "../components/modals/CreateSubfolderModal";
import { RenameFolderModal } from "../components/modals/RenameFolderModal";
import { ConfirmDialog } from "../components/common/ConfirmDialog";

type FolderDialog = "create" | "rename" | "delete" | null;

/**
 * The actions shared by every place a folder shows up (sidebar rows, folder
 * cards): their context menu entries, keyboard shortcuts and dialogs.
 */
export function useFolderActions(folder: BookmarkNode) {
	const [dialog, setDialog] = useState<FolderDialog>(null);
	const rootId = useBookmarkStore(state => state.bookmarkTree[0]?.id);
	const createBookmark = useBookmarkStore(state => state.createBookmark);
	const updateBookmark = useBookmarkStore(state => state.updateBookmark);
	const setFolderExpanded = useBookmarkStore(state => state.setFolderExpanded);

	const title = folder.title || "Untitled";
	// Bookmarks Bar, Other Bookmarks and friends cannot be renamed, moved or removed.
	const isPermanent = folder.parentId === rootId || Boolean(folder.unmodifiable);
	const closeDialog = () => setDialog(null);

	const remove = () => {
		if (isPermanent) return;
		// Empty folders go straight away; anything with content asks first, Undo or not.
		if (folder.children?.length) {
			setDialog("delete");
		} else {
			void deleteWithUndo(folder.id);
		}
	};

	const rename = () => {
		if (!isPermanent) setDialog("rename");
	};

	const menuItems: ContextMenuItem[] = [
		{
			id: "create-subfolder",
			label: "New subfolder",
			icon: <FolderPlus className="w-4 h-4" />,
			disabled: Boolean(folder.unmodifiable),
			onClick: () => setDialog("create")
		},
		...(!isPermanent
			? [
					{
						id: "rename-folder",
						label: "Rename",
						icon: <Pencil className="w-4 h-4" />,
						onClick: rename
					},
					{
						id: "delete-folder",
						label: "Delete",
						icon: <Trash2 className="w-4 h-4" />,
						danger: true,
						separatorBefore: true,
						onClick: remove
					}
				]
			: [])
	];

	/** Delete/Backspace removes the folder, F2 renames it. Returns whether the key was used. */
	const handleKey = (event: React.KeyboardEvent): boolean => {
		if (event.altKey || event.ctrlKey || event.metaKey) return false;
		if (event.key === "Delete" || event.key === "Backspace") {
			remove();
			return !isPermanent;
		}
		if (event.key === "F2") {
			rename();
			return !isPermanent;
		}
		return false;
	};

	const bookmarkCount = dialog === "delete" ? countBookmarks(folder) : 0;

	const dialogs = (
		<>
			<CreateSubfolderModal
				isOpen={dialog === "create"}
				onClose={closeDialog}
				parentFolderName={title}
				onCreate={async name => {
					await createBookmark(folder.id, name);
					setFolderExpanded(folder.id, true);
				}}
			/>
			<RenameFolderModal
				isOpen={dialog === "rename"}
				onClose={closeDialog}
				currentName={title}
				onRename={async name => {
					await updateBookmark(folder.id, { title: name });
				}}
			/>
			<ConfirmDialog
				isOpen={dialog === "delete"}
				onClose={closeDialog}
				onConfirm={() => {
					closeDialog();
					void deleteWithUndo(folder.id);
				}}
				title="Delete folder"
				message={`Delete "${title}" and everything in it${
					bookmarkCount > 0 ? ` (${bookmarkCount} bookmark${bookmarkCount === 1 ? "" : "s"})` : ""
				}? You can undo this right afterwards.`}
				confirmLabel="Delete"
				isDestructive
			/>
		</>
	);

	return { menuItems, dialogs, handleKey };
}
