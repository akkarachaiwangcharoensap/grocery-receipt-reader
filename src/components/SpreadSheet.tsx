import React, { useRef, useEffect, useMemo } from "react";
import jspreadsheet, { JSpreadsheetOptions } from "jspreadsheet-ce";
import "jspreadsheet-ce/dist/jspreadsheet.css";
import "jsuites/dist/jsuites.css";

interface JSpreadsheetDivElement extends HTMLDivElement {
    jspreadsheet?: any;
    jexcel?: any;
}

interface SpreadSheetProps {
    data: any[] | null;
    onDataChange: (data: any[]) => void; // Prop to handle data change
}

const SpreadSheet: React.FC<SpreadSheetProps> = ({ data, onDataChange }) => {
    const jRef = useRef<JSpreadsheetDivElement | null>(null);

    const options: JSpreadsheetOptions = useMemo(() => ({
        data: data || [],
        minDimensions: [2, 5],
        columns: [
            {
                type: 'text',
                width: '300',
                name: 'name',
                title: 'Name',
            },
            {
                type: 'text',
                width: '150',
                name: 'value',
                title: 'Value',
            },
        ],
        onchange: (
            instance: JSpreadsheetDivElement,
            cell: HTMLTableCellElement,
            colIndex: string | number,
            rowIndex: string | number,
            newValue: any,
            oldValue: any
        ) => {
            const updatedData = instance.jspreadsheet.getData().map((row: any[]) => ({
                name: row[0],
                value: row[1],
            }));
            onDataChange(updatedData);
        },
    }), [data, onDataChange]);

    useEffect(() => {
        if (jRef.current && !jRef.current.jspreadsheet) {
            jspreadsheet(jRef.current, options);
        }
    }, [options]);

    return <div ref={jRef} />;
};

export default SpreadSheet;