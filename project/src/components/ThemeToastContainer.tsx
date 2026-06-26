import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useTheme } from '../context/ThemeContext';

const ThemeToastContainer = () => {
    const { resolvedTheme } = useTheme();

    return (
        <ToastContainer
            position="top-right"
            autoClose={3000}
            newestOnTop
            closeOnClick
            pauseOnHover
            theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
        />
    );
};

export default ThemeToastContainer;
