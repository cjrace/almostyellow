"use client";

import {
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  Checkbox,
  Modal,
  Button,
  Textarea,
  Space,
  Group,
  ActionIcon,
  Text,
  Divider,
  Alert,
} from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";
import { signInWithCustomToken, signOut } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { firestoreTokenAction } from "@/actions/firestoreTokenAction";
import {
  clientAuth,
  clientFirestore,
  type FirebaseClientConfig,
} from "@/firebase/client";

// Each item is its own Firestore document, read with a live listener so
// changes from the other person's device appear without a refresh. Changes
// show straight away and the Firestore SDK queues them while offline, sending
// them once the connection is back. The queue is only kept in memory, so
// changes not yet sent are lost if the page is closed.
//
// When two devices change the same item, the change that reaches Firestore
// last wins. A deleted item stays deleted: a change to it from a device that
// was offline is refused, because updateDoc only updates items that exist.

export interface Item {
  id: string;
  text: string;
  checked: boolean;
  // Changed on this device but not yet saved to Firestore
  pending: boolean;
}

interface StoredItem {
  text: string;
  checked: boolean;
}

const COLLECTION = "shoppingItems";

// The Security Rules refuse anything longer
const MAX_TEXT_LENGTH = 255;

// The browser's Firebase sign-in lasts as long as the page, so an open list
// checks this often that the session it came from is still valid
const SESSION_CHECK_MS = 5 * 60 * 1000;

const LOAD_FAILED = "Could not load the list. Try reloading the page.";

const LOAD_OFFLINE =
  "The list needs a connection to open. Reload the page once you have signal.";

const SAVE_FAILED =
  "A change could not be saved, so the list shows what was saved last. Someone may have deleted the item on another device.";

// Online a change usually saves within a moment and a dropped connection often
// comes straight back, so only say so once it has lasted this long, rather
// than flashing a message every time
const SHOW_AFTER_MS = 1000;

function subscribeToConnection(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

// Without a valid session the action sends the browser to the login page,
// and unmounting this list signs the browser out of Firebase
function checkSession() {
  // Offline the check cannot reach the server, so try again next time
  firestoreTokenAction().catch(() => undefined);
}

// Shows its children once they have been on the page for SHOW_AFTER_MS
function ShowAfterDelay({ children }: { children: ReactNode }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(true);
    }, SHOW_AFTER_MS);
    return () => {
      clearTimeout(timer);
    };
  }, []);
  return show ? children : null;
}

function ItemRow({
  item,
  onCheck,
  onDelete,
}: {
  item: Item;
  onCheck: (checked: boolean) => void;
  onDelete: () => void;
}) {
  return (
    <Group justify="space-between" wrap="nowrap" mb="sm">
      <Group gap="xs" wrap="nowrap">
        <Checkbox
          id={item.id}
          checked={item.checked}
          onChange={(event) => {
            onCheck(event.currentTarget.checked);
          }}
          label={item.text}
          size="lg"
        />
        {item.pending && (
          <ShowAfterDelay>
            <Text size="xs" c="dimmed">
              Not synced yet
            </Text>
          </ShowAfterDelay>
        )}
      </Group>
      <ActionIcon
        aria-label={`Delete ${item.text}`}
        size="lg"
        variant="default"
        onClick={onDelete}
      >
        <IconTrash />
      </ActionIcon>
    </Group>
  );
}

const ChopinLiszt = ({
  firebaseConfig,
}: {
  firebaseConfig: FirebaseClientConfig;
}) => {
  const [modalOpened, { open, close }] = useDisclosure(false);
  const [items, setItems] = useState<Item[] | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [newItemText, setNewItemText] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // The phone can report being online on a signal too weak to reach
  // Firestore, so also go by whether the list is showing saved data or only
  // what this page last saw
  const [connected, setConnected] = useState(true);
  const online = useSyncExternalStore(
    subscribeToConnection,
    () => navigator.onLine,
    () => true,
  );

  // Signs the browser in to Firebase from the session, then listens to the
  // list until the page closes
  useEffect(() => {
    const auth = clientAuth(firebaseConfig);
    const db = clientFirestore(firebaseConfig);
    const closed = new AbortController();
    const isClosed = () => closed.signal.aborted;
    let stopListening: Unsubscribe | undefined;
    // A list opened again in the same tab is first shown from what this page
    // last saw, which should not count as losing the connection
    let synced = false;

    void (async () => {
      const token = await firestoreTokenAction();
      if (isClosed()) return;
      const { user } = await signInWithCustomToken(auth, token);
      if (isClosed()) return;
      setUid(user.uid);
      stopListening = onSnapshot(
        query(collection(db, COLLECTION), orderBy("order")),
        // Also called when a pending change is saved, to update its label
        { includeMetadataChanges: true },
        (snapshot) => {
          const { fromCache } = snapshot.metadata;
          if (!fromCache) synced = true;
          setConnected(!fromCache || !synced);
          setItems(
            snapshot.docs.map((item) => {
              const data = item.data() as StoredItem;
              return {
                id: item.id,
                text: data.text,
                checked: data.checked,
                pending: item.metadata.hasPendingWrites,
              };
            }),
          );
        },
        (listenError) => {
          console.error("Error listening to the list:", listenError);
          setError(LOAD_FAILED);
        },
      );
    })().catch((signInError: unknown) => {
      console.error("Error signing in to Firestore:", signInError);
      setError(navigator.onLine ? LOAD_FAILED : LOAD_OFFLINE);
    });

    return () => {
      closed.abort();
      stopListening?.();
      void signOut(auth);
    };
  }, [firebaseConfig]);

  useEffect(() => {
    const checkWhenVisible = () => {
      if (document.visibilityState === "visible") checkSession();
    };
    const timer = setInterval(checkWhenVisible, SESSION_CHECK_MS);
    document.addEventListener("visibilitychange", checkWhenVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", checkWhenVisible);
    };
  }, []);

  // Changes not yet saved are lost if the page closes, so ask first. Phones
  // do not ask when the app is swiped away.
  const unsaved = items?.some((item) => item.pending) ?? false;
  useEffect(() => {
    if (!unsaved) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      window.removeEventListener("beforeunload", warn);
    };
  }, [unsaved]);

  const saveFailed = (saveError: unknown) => {
    console.error("Error saving a change:", saveError);
    setError(SAVE_FAILED);
  };

  // Writes are not awaited: offline, they only settle once the change reaches
  // Firestore, but the list shows them straight away
  const addItems = () => {
    if (!uid) return;
    const texts = newItemText
      .split("\n")
      .map((text) => text.trim())
      .filter((text) => text !== "");
    if (texts.some((text) => text.length > MAX_TEXT_LENGTH)) {
      setInputError(
        `Each item must be ${String(MAX_TEXT_LENGTH)} characters or fewer.`,
      );
      return;
    }

    const db = clientFirestore(firebaseConfig);
    const now = Date.now();
    texts.forEach((text, index) => {
      setDoc(doc(collection(db, COLLECTION)), {
        text,
        checked: false,
        order: now + index,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        updatedBy: uid,
      }).catch(saveFailed);
    });
    close();
    setNewItemText("");
    setInputError(null);
  };

  // Saves the state the box was changed to, rather than flipping whatever is
  // stored, so a change that is sent twice cannot undo itself
  const setChecked = (item: Item, checked: boolean) => {
    if (!uid) return;
    const db = clientFirestore(firebaseConfig);
    updateDoc(doc(db, COLLECTION, item.id), {
      checked,
      updatedAt: serverTimestamp(),
      updatedBy: uid,
    }).catch(saveFailed);
  };

  const removeItem = (item: Item) => {
    const db = clientFirestore(firebaseConfig);
    deleteDoc(doc(db, COLLECTION, item.id)).catch(saveFailed);
  };

  const errorAlert =
    error === null ? null : (
      <Alert
        color="red"
        mb="md"
        withCloseButton
        closeButtonLabel="Dismiss"
        onClose={() => {
          setError(null);
        }}
      >
        {error}
      </Alert>
    );

  if (!items) {
    return errorAlert ?? <Text>Fetching list...</Text>;
  }

  const uncheckedItems = items.filter((item) => !item.checked);
  const checkedItems = items.filter((item) => item.checked);

  const row = (item: Item) => (
    <ItemRow
      key={item.id}
      item={item}
      onCheck={(checked) => {
        setChecked(item, checked);
      }}
      onDelete={() => {
        removeItem(item);
      }}
    />
  );

  return (
    <>
      <Modal
        opened={modalOpened}
        onClose={close}
        closeButtonProps={{ "aria-label": "Close modal" }}
        title="Add new items"
      >
        <Textarea
          data-autofocus
          placeholder="Add new items, one per line..."
          value={newItemText}
          onChange={(e) => {
            setNewItemText(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              addItems();
            }
          }}
          error={inputError}
          autosize
          minRows={7}
        />
        <Button
          mt="md"
          onClick={addItems}
          aria-label="Add items and close modal"
        >
          Add item(s)
        </Button>
      </Modal>

      {errorAlert}
      {(!online || !connected) && (
        <ShowAfterDelay>
          <Alert mb="md">
            You&apos;re offline. Changes will sync when you reconnect, as long
            as this page stays open.
          </Alert>
        </ShowAfterDelay>
      )}

      <Button onClick={open}>Add new item(s)</Button>
      <Space h="xl" />

      {uncheckedItems.map(row)}

      {checkedItems.length > 0 && (
        <>
          <Space h="xl" />
          <Divider mb="sm" />
          <Text size="md" mb="xs">
            Completed
          </Text>
          {checkedItems.map(row)}
        </>
      )}
    </>
  );
};

export default ChopinLiszt;
