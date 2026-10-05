"use client";import {useEffect,useRef,useState} from "react";import {api} from "../../../lib/api";import {CandidateStructuredFields} from "../../components/StructuredMatchingFields";
const steps=["Datos","Trabajo","Estudios","Experiencia","Habilidades","Revisar"];const blank:any={education:[{}],experience:[],confirmations:{},contact_preference:"WhatsApp"};
const mobility=["Cerca de donde vivo","Dentro de mi distrito","Distritos cercanos","Toda mi provincia","Otras provincias","Dispuesto/a a reubicarme"],documentOptions=["Cédula","Pasaporte","Otro documento"];
