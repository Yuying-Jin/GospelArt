'use client'
import { createContext, useState, useContext } from 'react';

interface ModalContextType {
    isOpen: boolean;
    currentIndex: number;
    openModal: (index: number) => void;
    closeModal: () => void;
    setIndex: (index: number) => void;
}

const GalleryModalContext = createContext<ModalContextType | undefined>(undefined);

export const GalleryModalProvider = ({ children }: { children: React.ReactNode }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);

    const openModal = (index: number) => {
        setCurrentIndex(index);
        setIsOpen(true);
    };
    const closeModal = () => setIsOpen(false);
    const setIndex = (index: number) => setCurrentIndex(index);

    return (
        <GalleryModalContext.Provider value={{ isOpen, currentIndex, openModal, closeModal, setIndex }}>
            {children}
        </GalleryModalContext.Provider>
    );
};

export const useModal = () => {
    const context = useContext(GalleryModalContext);
    if (!context) throw new Error('useModal must be used within GalleryModalProvider');
    return context;
};
