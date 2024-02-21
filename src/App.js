import React, { useState, useEffect } from "react";
import "./App.css";
import "@aws-amplify/ui-react/styles.css";
import {
  Button,
  Flex,
  Heading,
  Text,
  TextField,
  Image,
  View,
  Card,
  withAuthenticator,
  TextAreaField,
} from "@aws-amplify/ui-react";
import { listNotes } from "./graphql/queries";
import {
  createNote as createNoteMutation,
  deleteNote as deleteNoteMutation,
} from "./graphql/mutations";
import { generateClient } from 'aws-amplify/api';
import { uploadData, getUrl, remove } from 'aws-amplify/storage';
import { StorageManager } from '@aws-amplify/ui-react-storage';
import '@aws-amplify/ui-react/styles.css';
import  { useRef } from 'react';

const client = generateClient();

const App = ({ signOut }) => {
  const [notes, setNotes] = useState([]);
  const storageManagerRef = useRef(null);
  const [imageFile, setImageFile] = useState([]);

  useEffect(() => {
    fetchNotes();
  }, []);

  async function fetchNotes() {
    const apiData = await client.graphql({ query: listNotes });
    const notesFromAPI = apiData.data.listNotes.items;
    await Promise.all(
      notesFromAPI.map(async (note) => {
        if (note.image) {
          const url = await getUrl({ key: note.name });
          note.image = url.url;  
        }
        return note;
      })
    );
    setNotes(notesFromAPI);
  }

  const processFile = ({ file, key }) => {
    setImageFile(file)
    return { file, key,metadata: { id: key}};
  };


  async function createNote(event) {
    event.preventDefault();
    const form = new FormData(event.target);
    const image = imageFile;
    const data = {
      name: form.get("name"),
      description: form.get("description"),
      image: image.name,
    };
    if (!!data.image) await uploadData({
      key: data.name,
      data: image
    });
    await client.graphql({
      query: createNoteMutation,
      variables: { input: data },
    });
    fetchNotes();
    event.target.reset();
    storageManagerRef.current.clearFiles();
  }

  async function deleteNote({ id, name }) {
    const newNotes = notes.filter((note) => note.id !== id);
    setNotes(newNotes);
    await remove({ key: name });
    await client.graphql({
      query: deleteNoteMutation,
      variables: { input: { id } },
    });
  }

  return (
    <Card className="App" variation="elevated">
      <Heading className="Heading" level={1}>My Notes App</Heading>
      <Card variation="elevated" >
        <View as="form" className="form-note" onSubmit={createNote}>
            <TextField
              name="name"
              label="Title"
              required
            />
            <TextAreaField
            name="description"
            label="Description"
            required
          />

          <StorageManager
                acceptedFileTypes={['image/*']}
                accessLevel="guest"
                maxFileCount={1}
                isResumable
                processFile={processFile}
                ref={storageManagerRef}
              />
         
              {/* <View
                name="image"
                as="input"
                type="file"
                style={{ alignSelf: "end" }}
              /> */}
          <Button style={{ alignSelf: "end" }} width={230} type="submit" variation="primary">
            Create Note
          </Button>
      </View>
      </Card>
      
      <Heading level={2}>Current Notes</Heading>
      <View margin="3rem 0">
        {notes.map((note) => (
          <Flex
            key={note.id || note.name}
            direction="row"
            justifyContent="center"
            alignItems="center"
          >
            <Text as="strong" fontWeight={700}>
              {note.name}
            </Text>
            <Text as="span">{note.description}</Text>
            {note.image && (
              <Image
                src={note.image}
                alt={`visual aid for ${notes.name}`}
                style={{ width: 400 }}
              />
            )}
            <Button variation="link" onClick={() => deleteNote(note)}>
              Delete note
            </Button>
          </Flex>
        ))}
      </View>
      <Button onClick={signOut}>Sign Out</Button>
    </Card> 
  );
};

export default withAuthenticator(App);